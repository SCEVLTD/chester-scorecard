-- ============================================
-- Security Hardening Migration
-- Migration: 20260210_security_hardening
-- Applied: 2026-02-10
--
-- Covers four security tasks:
--   17.1 - Fix consultant financial data leakage (consultant-safe view)
--   17.2 - Convert SECURITY DEFINER views to SECURITY INVOKER
--   17.3 - Set explicit search_path on all functions
--   17.4 - Password policy (documentation only, no schema changes)
-- ============================================


-- ============================================
-- TASK 17.1: Fix Consultant Financial Data Leakage
-- ============================================
-- Problem: is_admin() returns true for consultants, giving them full SELECT
-- on company_submissions via RLS. The table contains financial columns
-- (revenue_actual, revenue_target, gross_profit_actual, etc.) that
-- consultants should not see. Currently financial hiding is app-layer only,
-- meaning a consultant can query raw financial data via Supabase JS client
-- or browser DevTools.
--
-- Solution: Create helper functions to distinguish super_admin from consultant,
-- and a consultant-safe view that excludes financial columns. The application
-- layer will be updated (in a separate frontend task) to use this view for
-- consultant sessions.
--
-- Note: PostgreSQL RLS operates at the row level, not column level. We cannot
-- restrict specific columns via RLS policies. The consultant_company_submissions
-- view is the correct approach for column-level restriction.
-- ============================================

-- New helper: returns true ONLY for super_admin (not consultant)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'user_role' IN ('admin', 'super_admin'),
    false
  )
$$ LANGUAGE sql STABLE SET search_path = public;

-- New helper: returns true ONLY for consultant role
CREATE OR REPLACE FUNCTION public.is_consultant()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'user_role' = 'consultant',
    false
  )
$$ LANGUAGE sql STABLE SET search_path = public;

-- Create consultant-safe view of company_submissions
-- Includes: qualitative fields, scoring fields, metadata, N/A flags, lead KPIs
-- Excludes: all £ financial columns (revenue, gross profit, overheads, net profit, wages)
--
-- Uses SECURITY INVOKER so the view respects the caller's RLS policies
-- (i.e., the underlying company_submissions RLS still applies)
CREATE OR REPLACE VIEW public.consultant_company_submissions
WITH (security_invoker = true) AS
SELECT
  cs.id,
  cs.data_request_id,
  -- Qualitative fields (safe for consultant)
  cs.company_biggest_opportunity,
  cs.company_biggest_risk,
  cs.company_challenges,
  cs.company_wins,
  -- Scoring/qualitative assessment fields (safe for consultant)
  cs.leadership,
  cs.market_demand,
  cs.marketing,
  cs.product_strength,
  cs.supplier_strength,
  cs.sales_execution,
  -- N/A flags (safe - just booleans indicating which sections are not applicable)
  cs.revenue_na,
  cs.gross_profit_na,
  cs.overheads_na,
  cs.wages_na,
  -- Net profit override flag (boolean, not a financial value)
  cs.net_profit_override,
  -- Lead KPIs (activity counts, not financial)
  cs.outbound_calls,
  cs.first_orders,
  -- Metadata
  cs.submitted_at,
  cs.submitted_by_name,
  cs.submitted_by_email
FROM public.company_submissions cs;

-- Grant consultant (and all authenticated) access to the view
-- RLS on the underlying company_submissions table still applies via SECURITY INVOKER
GRANT SELECT ON public.consultant_company_submissions TO authenticated;

-- Note: We keep existing RLS policies on company_submissions as-is for now.
-- Consultants CAN still query company_submissions directly (is_admin() returns true
-- for consultants). The APPLICATION LAYER change to route consultant queries through
-- the consultant_company_submissions view will happen in a separate frontend task.
-- This migration establishes the database-side infrastructure for that change.


-- ============================================
-- TASK 17.2: Convert SECURITY DEFINER Views to SECURITY INVOKER
-- ============================================
-- Problem: Views created without explicit security_invoker setting default to
-- SECURITY DEFINER in PostgreSQL, meaning they execute as the view owner
-- (typically the superuser) and bypass RLS. This means ANY authenticated user
-- can see aggregate financial data from these views, regardless of their role.
--
-- Solution: Recreate all three aggregate views with security_invoker = true
-- so that the caller's RLS policies on the underlying tables are respected.
-- ============================================

-- ----- city_monthly_aggregate -----
DROP VIEW IF EXISTS public.city_monthly_aggregate;

CREATE OR REPLACE VIEW public.city_monthly_aggregate
WITH (security_invoker = true) AS
WITH monthly_data AS (
  SELECT
    dr.month,
    b.id AS business_id,
    b.name AS business_name,
    b.e_profile,
    cs.revenue_actual,
    cs.revenue_target,
    cs.net_profit_actual AS ebitda_actual,
    cs.net_profit_target AS ebitda_target
  FROM public.company_submissions cs
  JOIN public.data_requests dr ON cs.data_request_id = dr.id
  JOIN public.businesses b ON dr.business_id = b.id
)
SELECT
  month,
  -- Business counts
  COUNT(DISTINCT business_id) AS business_count,
  COUNT(DISTINCT CASE WHEN ebitda_actual IS NOT NULL AND ebitda_actual != 0 THEN business_id END) AS businesses_with_ebitda,

  -- Revenue aggregates
  COALESCE(SUM(revenue_actual), 0) AS total_revenue_actual,
  COALESCE(SUM(revenue_target), 0) AS total_revenue_target,

  -- EBITDA aggregates
  COALESCE(SUM(ebitda_actual), 0) AS total_ebitda_actual,
  COALESCE(SUM(ebitda_target), 0) AS total_ebitda_target,

  -- Variance percentages
  CASE
    WHEN SUM(revenue_target) > 0
    THEN ROUND(((SUM(revenue_actual) - SUM(revenue_target)) / SUM(revenue_target) * 100)::numeric, 1)
    ELSE NULL
  END AS revenue_variance_pct,
  CASE
    WHEN SUM(ebitda_target) > 0
    THEN ROUND(((SUM(ebitda_actual) - SUM(ebitda_target)) / SUM(ebitda_target) * 100)::numeric, 1)
    ELSE NULL
  END AS ebitda_variance_pct,

  -- EBITDA percentage (actual EBITDA as % of actual revenue)
  CASE
    WHEN SUM(revenue_actual) > 0
    THEN ROUND((SUM(ebitda_actual) / SUM(revenue_actual) * 100)::numeric, 1)
    ELSE NULL
  END AS ebitda_pct_actual,
  CASE
    WHEN SUM(revenue_target) > 0
    THEN ROUND((SUM(ebitda_target) / SUM(revenue_target) * 100)::numeric, 1)
    ELSE NULL
  END AS ebitda_pct_target,

  -- E-Profile breakdown counts
  COUNT(DISTINCT CASE WHEN e_profile = 'E0' THEN business_id END) AS e0_count,
  COUNT(DISTINCT CASE WHEN e_profile = 'E1' THEN business_id END) AS e1_count,
  COUNT(DISTINCT CASE WHEN e_profile = 'E2' THEN business_id END) AS e2_count,
  COUNT(DISTINCT CASE WHEN e_profile = 'E3' THEN business_id END) AS e3_count,
  COUNT(DISTINCT CASE WHEN e_profile = 'E4' THEN business_id END) AS e4_count,
  COUNT(DISTINCT CASE WHEN e_profile = 'E5' THEN business_id END) AS e5_count
FROM monthly_data
GROUP BY month
ORDER BY month DESC;

-- ----- eprofile_monthly_aggregate -----
DROP VIEW IF EXISTS public.eprofile_monthly_aggregate;

CREATE OR REPLACE VIEW public.eprofile_monthly_aggregate
WITH (security_invoker = true) AS
WITH monthly_data AS (
  SELECT
    dr.month,
    b.id AS business_id,
    b.name AS business_name,
    b.e_profile,
    cs.revenue_actual,
    cs.revenue_target,
    cs.net_profit_actual AS ebitda_actual,
    cs.net_profit_target AS ebitda_target
  FROM public.company_submissions cs
  JOIN public.data_requests dr ON cs.data_request_id = dr.id
  JOIN public.businesses b ON dr.business_id = b.id
  WHERE b.e_profile IS NOT NULL
)
SELECT
  month,
  e_profile,
  COUNT(DISTINCT business_id) AS business_count,
  COALESCE(SUM(revenue_actual), 0) AS total_revenue_actual,
  COALESCE(SUM(revenue_target), 0) AS total_revenue_target,
  COALESCE(SUM(ebitda_actual), 0) AS total_ebitda_actual,
  COALESCE(SUM(ebitda_target), 0) AS total_ebitda_target,
  CASE
    WHEN SUM(revenue_target) > 0
    THEN ROUND(((SUM(revenue_actual) - SUM(revenue_target)) / SUM(revenue_target) * 100)::numeric, 1)
    ELSE NULL
  END AS revenue_variance_pct,
  CASE
    WHEN SUM(revenue_actual) > 0
    THEN ROUND((SUM(ebitda_actual) / SUM(revenue_actual) * 100)::numeric, 1)
    ELSE NULL
  END AS ebitda_pct_actual
FROM monthly_data
GROUP BY month, e_profile
ORDER BY month DESC, e_profile;

-- ----- city_ytd_aggregate -----
DROP VIEW IF EXISTS public.city_ytd_aggregate;

CREATE OR REPLACE VIEW public.city_ytd_aggregate
WITH (security_invoker = true) AS
WITH monthly_data AS (
  SELECT
    dr.month,
    SUBSTRING(dr.month FROM 1 FOR 4) AS year,
    b.id AS business_id,
    cs.revenue_actual,
    cs.revenue_target,
    cs.net_profit_actual AS ebitda_actual,
    cs.net_profit_target AS ebitda_target
  FROM public.company_submissions cs
  JOIN public.data_requests dr ON cs.data_request_id = dr.id
  JOIN public.businesses b ON dr.business_id = b.id
)
SELECT
  year,
  COUNT(DISTINCT business_id) AS business_count,
  COALESCE(SUM(revenue_actual), 0) AS ytd_revenue_actual,
  COALESCE(SUM(revenue_target), 0) AS ytd_revenue_target,
  COALESCE(SUM(ebitda_actual), 0) AS ytd_ebitda_actual,
  COALESCE(SUM(ebitda_target), 0) AS ytd_ebitda_target,
  CASE
    WHEN SUM(revenue_target) > 0
    THEN ROUND(((SUM(revenue_actual) - SUM(revenue_target)) / SUM(revenue_target) * 100)::numeric, 1)
    ELSE NULL
  END AS revenue_variance_pct,
  CASE
    WHEN SUM(revenue_actual) > 0
    THEN ROUND((SUM(ebitda_actual) / SUM(revenue_actual) * 100)::numeric, 1)
    ELSE NULL
  END AS ebitda_pct_actual
FROM monthly_data
GROUP BY year
ORDER BY year DESC;

-- Re-grant SELECT after view recreation
GRANT SELECT ON public.city_monthly_aggregate TO authenticated;
GRANT SELECT ON public.eprofile_monthly_aggregate TO authenticated;
GRANT SELECT ON public.city_ytd_aggregate TO authenticated;


-- ============================================
-- TASK 17.3: Fix Mutable search_path on All Functions
-- ============================================
-- Problem: Functions without an explicit search_path are vulnerable to
-- search_path manipulation attacks. A malicious user could create objects
-- in a schema that appears earlier in the search_path, causing the function
-- to reference attacker-controlled objects instead of the intended ones.
--
-- Solution: Add SET search_path = public to every function. For functions
-- that are SECURITY DEFINER (which run as the function owner and can
-- bypass RLS), this is especially critical.
--
-- supabase db lint flags these as: "Function has a mutable search_path"
-- ============================================

-- ----- is_admin (existing, add search_path) -----
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'user_role' IN ('admin', 'super_admin', 'consultant'),
    false
  )
$$ LANGUAGE sql STABLE SET search_path = public;

-- ----- get_my_business_id (existing, add search_path) -----
CREATE OR REPLACE FUNCTION public.get_my_business_id()
RETURNS UUID AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb->>'business_id',
    ''
  )::UUID
$$ LANGUAGE sql STABLE SET search_path = public;

-- ----- handle_new_user (existing, SECURITY DEFINER + add search_path) -----
-- This trigger function runs when a new auth.users row is inserted.
-- It must be SECURITY DEFINER to access auth.users and insert into profiles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ----- custom_access_token_hook (existing, SECURITY DEFINER + add search_path) -----
-- This is the auth hook that injects user_role and business_id into JWT claims.
-- It must be SECURITY DEFINER to bypass RLS when reading admins, company_emails,
-- and businesses tables.
-- This recreates the final version from 20260204_fix_email_case_sensitivity.sql
-- with the addition of SET search_path = public.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  claims jsonb;
  user_email text;
  admin_record record;
  matched_business_id uuid;
BEGIN
  -- Get the user's email (lowercase for case-insensitive matching)
  user_email := LOWER(event->'claims'->>'email');

  -- Check if user is in admins table and get their role (case-insensitive)
  SELECT email, role INTO admin_record
  FROM public.admins
  WHERE LOWER(email) = user_email;

  -- If admin found, set role from their record
  IF FOUND THEN
    claims := event->'claims';
    claims := jsonb_set(claims, '{user_role}', to_jsonb(admin_record.role));
    claims := jsonb_set(claims, '{business_id}', 'null');
    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
  END IF;

  -- Check if user email matches a company_emails entry (case-insensitive)
  SELECT business_id INTO matched_business_id
  FROM public.company_emails
  WHERE LOWER(email) = user_email
  LIMIT 1;

  -- If no match in company_emails, check businesses.contact_email (case-insensitive)
  IF matched_business_id IS NULL THEN
    SELECT id INTO matched_business_id
    FROM public.businesses
    WHERE LOWER(contact_email) = user_email
    LIMIT 1;
  END IF;

  -- If still no match, check by auth_user_id
  IF matched_business_id IS NULL THEN
    SELECT id INTO matched_business_id
    FROM public.businesses
    WHERE auth_user_id = (event->'claims'->>'sub')::uuid
    LIMIT 1;
  END IF;

  -- Build the claims
  claims := event->'claims';

  IF matched_business_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', '"business_user"');
    claims := jsonb_set(claims, '{business_id}', to_jsonb(matched_business_id::text));
  ELSE
    -- Not admin and not business user = unauthorized (no role)
    claims := jsonb_set(claims, '{user_role}', 'null');
    claims := jsonb_set(claims, '{business_id}', 'null');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$function$;

-- Re-grant permissions on the auth hook (these were set in previous migrations
-- but we re-assert them here for safety after the CREATE OR REPLACE)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- ----- calculate_e_profile (existing, add search_path) -----
-- Pure function that calculates E-Profile category from annual revenue.
-- IMMUTABLE, no security concerns, but we fix search_path for consistency.
CREATE OR REPLACE FUNCTION public.calculate_e_profile(annual_revenue numeric)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF annual_revenue IS NULL THEN
    RETURN NULL;
  ELSIF annual_revenue < 500000 THEN
    RETURN 'E0';
  ELSIF annual_revenue < 1500000 THEN
    RETURN 'E1';
  ELSIF annual_revenue < 5000000 THEN
    RETURN 'E2';
  ELSIF annual_revenue < 11000000 THEN
    RETURN 'E3';
  ELSIF annual_revenue < 20000000 THEN
    RETURN 'E4';
  ELSE
    RETURN 'E5';
  END IF;
END;
$$;


-- ============================================
-- TASK 17.4: Password Policy
-- ============================================
-- Minimum password length has been increased to 12 characters in the
-- create-company-account Edge Function (separate deployment).
--
-- Additionally, enable HaveIBeenPwned leaked password detection:
--   Supabase Dashboard > Authentication > Settings > Security
--   Toggle on "Leaked Password Protection"
--
-- No database migration is needed for this task.
-- ============================================
