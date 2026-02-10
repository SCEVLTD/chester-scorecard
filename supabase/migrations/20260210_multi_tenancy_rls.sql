-- ============================================
-- Phase 23.2: Multi-Tenancy - JWT Hook & RLS Policy Updates
-- Migration: 20260210_multi_tenancy_rls
-- Applied: 2026-02-10
--
-- Purpose: Update the JWT custom access token hook to inject organisation_id
-- into claims, and update RLS policies on all tenant-scoped tables to filter
-- by organisation. Uses a graceful NULL fallback pattern so existing sessions
-- (without organisation_id in their JWT) continue to work until re-login.
--
-- Depends on: 20260210_multi_tenancy_organisations (Phase 23.1)
--   - organisations table exists
--   - organisation_id column on businesses, admins, invitations, meetings, audit_log
--   - get_my_org_id() helper function exists
--
-- NULL fallback pattern:
--   (get_my_org_id() IS NULL OR table.organisation_id = get_my_org_id())
--   Meaning: if no org claim in JWT yet, allow current behaviour; once org
--   is in JWT, scope to that org only.
-- ============================================


-- ============================================
-- 1. UPDATE CUSTOM ACCESS TOKEN HOOK
-- ============================================
-- Now injects organisation_id alongside user_role and business_id.
-- For admins: looks up organisation_id from admins table.
-- For business users: looks up organisation_id from businesses table.
-- For unmatched users: sets organisation_id to null.

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
  matched_org_id uuid;
BEGIN
  -- Get the user's email (lowercase for case-insensitive matching)
  user_email := LOWER(event->'claims'->>'email');

  -- Check if user is in admins table and get their role + organisation_id
  SELECT email, role, organisation_id INTO admin_record
  FROM public.admins
  WHERE LOWER(email) = user_email;

  -- If admin found, set role and organisation from their record
  IF FOUND THEN
    claims := event->'claims';
    claims := jsonb_set(claims, '{user_role}', to_jsonb(admin_record.role));
    claims := jsonb_set(claims, '{business_id}', 'null');
    claims := jsonb_set(claims, '{organisation_id}', to_jsonb(admin_record.organisation_id::text));
    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
  END IF;

  -- Check if user email matches a company_emails entry (case-insensitive)
  SELECT business_id INTO matched_business_id
  FROM public.company_emails
  WHERE LOWER(email) = user_email
  LIMIT 1;

  -- Fallback: check businesses.contact_email for backwards compatibility
  IF matched_business_id IS NULL THEN
    SELECT id INTO matched_business_id
    FROM public.businesses
    WHERE LOWER(contact_email) = user_email
    LIMIT 1;
  END IF;

  -- Final fallback: check by auth_user_id
  IF matched_business_id IS NULL THEN
    SELECT id INTO matched_business_id
    FROM public.businesses
    WHERE auth_user_id = (event->'claims'->>'sub')::uuid
    LIMIT 1;
  END IF;

  -- Build the claims
  claims := event->'claims';

  IF matched_business_id IS NOT NULL THEN
    -- Look up the business's organisation_id
    SELECT organisation_id INTO matched_org_id
    FROM public.businesses
    WHERE id = matched_business_id;

    claims := jsonb_set(claims, '{user_role}', '"business_user"');
    claims := jsonb_set(claims, '{business_id}', to_jsonb(matched_business_id::text));
    claims := jsonb_set(claims, '{organisation_id}', to_jsonb(COALESCE(matched_org_id::text, '')));
  ELSE
    -- Not admin and not business user = unauthorised (no role)
    claims := jsonb_set(claims, '{user_role}', 'null');
    claims := jsonb_set(claims, '{business_id}', 'null');
    claims := jsonb_set(claims, '{organisation_id}', 'null');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$function$;

-- Re-grant permissions on the auth hook
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;


-- ============================================
-- 2. BUSINESSES TABLE - Update RLS policies
-- ============================================
-- Current policies:
--   "Admin can view all businesses" - is_admin()
--   "Business user can view own business" - id = get_my_business_id()
--   "Admin can insert businesses" - is_admin()
--   "Admin can update businesses" - is_admin()
--   "Admin can delete businesses" - is_admin()
--
-- Updated: admin policies scoped by organisation_id with NULL fallback.
-- Business user policy unchanged (already scoped to own business).

-- SELECT: admins see only businesses in their org
DROP POLICY IF EXISTS "Admin can view all businesses" ON public.businesses;
CREATE POLICY "Admin can view all businesses" ON public.businesses
  FOR SELECT USING (
    public.is_admin()
    AND (get_my_org_id() IS NULL OR organisation_id = get_my_org_id())
  );

-- Business user policy stays unchanged (scoped by business_id, not org)
-- "Business user can view own business" - id = get_my_business_id()

-- INSERT: admins can only insert businesses into their org
DROP POLICY IF EXISTS "Admin can insert businesses" ON public.businesses;
CREATE POLICY "Admin can insert businesses" ON public.businesses
  FOR INSERT WITH CHECK (
    public.is_admin()
    AND (get_my_org_id() IS NULL OR organisation_id = get_my_org_id())
  );

-- UPDATE: admins can only update businesses in their org
DROP POLICY IF EXISTS "Admin can update businesses" ON public.businesses;
CREATE POLICY "Admin can update businesses" ON public.businesses
  FOR UPDATE USING (
    public.is_admin()
    AND (get_my_org_id() IS NULL OR organisation_id = get_my_org_id())
  );

-- DELETE: admins can only delete businesses in their org
DROP POLICY IF EXISTS "Admin can delete businesses" ON public.businesses;
CREATE POLICY "Admin can delete businesses" ON public.businesses
  FOR DELETE USING (
    public.is_admin()
    AND (get_my_org_id() IS NULL OR organisation_id = get_my_org_id())
  );


-- ============================================
-- 3. ADMINS TABLE - Update RLS policies
-- ============================================
-- Current policies:
--   "Admins can read admins" - USING (true) [from 20260202_add_admins_table]
--   "Super admins can insert admins" - super_admin check via subquery
--   "Super admins can update admins" - super_admin check via subquery
--   "Super admins can delete admins" - super_admin check via subquery
--
-- Updated: SELECT scoped by org (admins see other admins in same org).
-- INSERT/UPDATE/DELETE scoped by org for super_admin.

-- SELECT: admins see other admins in the same organisation
DROP POLICY IF EXISTS "Admins can read admins" ON public.admins;
CREATE POLICY "Admins can read admins" ON public.admins
  FOR SELECT USING (
    -- Admins (super_admin + consultant) can see admins in their org
    (
      public.is_admin()
      AND (get_my_org_id() IS NULL OR organisation_id = get_my_org_id())
    )
    -- supabase_auth_admin needs access for the JWT hook
    OR auth.role() = 'service_role'
  );

-- INSERT: super_admin can only add admins to their own org
DROP POLICY IF EXISTS "Super admins can insert admins" ON public.admins;
CREATE POLICY "Super admins can insert admins" ON public.admins
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins a
      WHERE LOWER(a.email) = LOWER(current_setting('request.jwt.claims', true)::jsonb->>'email')
      AND a.role = 'super_admin'
    )
    AND (get_my_org_id() IS NULL OR organisation_id = get_my_org_id())
  );

-- UPDATE: super_admin can only update admins in their org
DROP POLICY IF EXISTS "Super admins can update admins" ON public.admins;
CREATE POLICY "Super admins can update admins" ON public.admins
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins a
      WHERE LOWER(a.email) = LOWER(current_setting('request.jwt.claims', true)::jsonb->>'email')
      AND a.role = 'super_admin'
    )
    AND (get_my_org_id() IS NULL OR organisation_id = get_my_org_id())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins a
      WHERE LOWER(a.email) = LOWER(current_setting('request.jwt.claims', true)::jsonb->>'email')
      AND a.role = 'super_admin'
    )
    AND (get_my_org_id() IS NULL OR organisation_id = get_my_org_id())
  );

-- DELETE: super_admin can only delete admins in their org
DROP POLICY IF EXISTS "Super admins can delete admins" ON public.admins;
CREATE POLICY "Super admins can delete admins" ON public.admins
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.admins a
      WHERE LOWER(a.email) = LOWER(current_setting('request.jwt.claims', true)::jsonb->>'email')
      AND a.role = 'super_admin'
    )
    AND (get_my_org_id() IS NULL OR organisation_id = get_my_org_id())
  );

-- Auth hook access policy: supabase_auth_admin must read admins to build JWT
-- This policy is critical - without it the JWT hook cannot look up admin roles
DROP POLICY IF EXISTS "Auth admin can read admins for hook" ON public.admins;
CREATE POLICY "Auth admin can read admins for hook" ON public.admins
  FOR SELECT TO supabase_auth_admin
  USING (true);


-- ============================================
-- 4. MEETINGS TABLE - Update RLS policies
-- ============================================
-- Current policies:
--   "Admin can view all meetings" - is_admin()
--   "Admin can insert meetings" - is_admin()
--   "Admin can update meetings" - is_admin()
--   "Admin can delete meetings" - is_admin()
--   "Consultant can view all meetings" - is_consultant()
--   "Consultant can insert meetings" - is_consultant()
--   "Consultant can update meetings" - is_consultant()
--
-- Updated: All scoped by organisation_id with NULL fallback.
-- Consolidate admin + consultant policies (is_admin() already covers both).

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can view all meetings" ON public.meetings;
DROP POLICY IF EXISTS "Consultant can view all meetings" ON public.meetings;
CREATE POLICY "Admin can view all meetings" ON public.meetings
  FOR SELECT USING (
    public.is_admin()
    AND (get_my_org_id() IS NULL OR organisation_id = get_my_org_id())
  );

DROP POLICY IF EXISTS "Admin can insert meetings" ON public.meetings;
DROP POLICY IF EXISTS "Consultant can insert meetings" ON public.meetings;
CREATE POLICY "Admin can insert meetings" ON public.meetings
  FOR INSERT WITH CHECK (
    public.is_admin()
    AND (get_my_org_id() IS NULL OR organisation_id = get_my_org_id())
  );

DROP POLICY IF EXISTS "Admin can update meetings" ON public.meetings;
DROP POLICY IF EXISTS "Consultant can update meetings" ON public.meetings;
CREATE POLICY "Admin can update meetings" ON public.meetings
  FOR UPDATE USING (
    public.is_admin()
    AND (get_my_org_id() IS NULL OR organisation_id = get_my_org_id())
  );

DROP POLICY IF EXISTS "Admin can delete meetings" ON public.meetings;
CREATE POLICY "Admin can delete meetings" ON public.meetings
  FOR DELETE USING (
    public.is_admin()
    AND (get_my_org_id() IS NULL OR organisation_id = get_my_org_id())
  );


-- ============================================
-- 5. INVITATIONS TABLE - Update RLS policies
-- ============================================
-- Current policies:
--   "Admins can manage invitations" - is_admin() FOR ALL
--   "Service role bypass for invitations" - auth.role() = 'service_role'
--
-- Updated: scoped by organisation_id with NULL fallback.

DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;
CREATE POLICY "Admins can manage invitations" ON public.invitations
  FOR ALL USING (
    public.is_admin()
    AND (get_my_org_id() IS NULL OR organisation_id = get_my_org_id())
  );

-- Service role bypass stays unchanged (Edge Functions need cross-org access)
-- "Service role bypass for invitations" - no change needed


-- ============================================
-- 6. AUDIT_LOG TABLE - Update RLS policies
-- ============================================
-- Current policy:
--   "Super admins can view audit logs" - user_role IN ('admin', 'super_admin')
--
-- Updated: scoped by organisation_id with NULL fallback.
-- Note: audit_log.organisation_id is nullable (system logs have no org).
-- Super admins see: logs in their org + logs with no org (system-level).

DROP POLICY IF EXISTS "Super admins can view audit logs" ON public.audit_log;
CREATE POLICY "Super admins can view audit logs" ON public.audit_log
  FOR SELECT USING (
    public.is_super_admin()
    AND (
      get_my_org_id() IS NULL
      OR organisation_id IS NULL
      OR organisation_id = get_my_org_id()
    )
  );


-- ============================================
-- 7. ADMIN_INVITATIONS TABLE - Update RLS policies
-- ============================================
-- Current policies check super_admin via subquery on admins table.
-- Updated: add org scoping so super_admins can only manage invitations
-- that will result in admins for their organisation.
-- Note: admin_invitations does not have organisation_id column yet,
-- so we scope via the requesting admin's org membership instead.
-- This is sufficient because the send-admin-invite Edge Function will
-- set the organisation_id when creating the admin record on acceptance.

-- No column-level org filter possible here (table lacks org_id).
-- The existing policies are already scoped to super_admin via subquery.
-- Phase 23.3 can add organisation_id to admin_invitations if needed.


-- ============================================
-- 8. SCORECARDS TABLE - No direct change needed
-- ============================================
-- Scorecards reference businesses via business_id FK.
-- The admin SELECT policy uses is_admin() which now scopes businesses by org.
-- However, the scorecard policies query scorecards directly, not via a join
-- to businesses. We need to add org filtering via a subquery.

-- Admin SELECT: only scorecards for businesses in their org
DROP POLICY IF EXISTS "Admin can view all scorecards" ON public.scorecards;
CREATE POLICY "Admin can view all scorecards" ON public.scorecards
  FOR SELECT USING (
    public.is_admin()
    AND (
      get_my_org_id() IS NULL
      OR business_id IN (
        SELECT id FROM public.businesses WHERE organisation_id = get_my_org_id()
      )
    )
  );

-- Business user policy unchanged (already scoped to own business)
-- "Business user can view own scorecards" - business_id = get_my_business_id()

-- Admin INSERT: only for businesses in their org
DROP POLICY IF EXISTS "Admin can insert scorecards" ON public.scorecards;
CREATE POLICY "Admin can insert scorecards" ON public.scorecards
  FOR INSERT WITH CHECK (
    public.is_admin()
    AND (
      get_my_org_id() IS NULL
      OR business_id IN (
        SELECT id FROM public.businesses WHERE organisation_id = get_my_org_id()
      )
    )
  );

-- Admin UPDATE: only for businesses in their org
DROP POLICY IF EXISTS "Admin can update scorecards" ON public.scorecards;
CREATE POLICY "Admin can update scorecards" ON public.scorecards
  FOR UPDATE USING (
    public.is_admin()
    AND (
      get_my_org_id() IS NULL
      OR business_id IN (
        SELECT id FROM public.businesses WHERE organisation_id = get_my_org_id()
      )
    )
  );

-- Admin DELETE: only for businesses in their org
DROP POLICY IF EXISTS "Admin can delete scorecards" ON public.scorecards;
CREATE POLICY "Admin can delete scorecards" ON public.scorecards
  FOR DELETE USING (
    public.is_admin()
    AND (
      get_my_org_id() IS NULL
      OR business_id IN (
        SELECT id FROM public.businesses WHERE organisation_id = get_my_org_id()
      )
    )
  );


-- ============================================
-- 9. DATA_REQUESTS TABLE - Scope by org via businesses
-- ============================================
-- Same pattern as scorecards: data_requests.business_id -> businesses.organisation_id

DROP POLICY IF EXISTS "Admin can view all data_requests" ON public.data_requests;
CREATE POLICY "Admin can view all data_requests" ON public.data_requests
  FOR SELECT USING (
    public.is_admin()
    AND (
      get_my_org_id() IS NULL
      OR business_id IN (
        SELECT id FROM public.businesses WHERE organisation_id = get_my_org_id()
      )
    )
  );

-- Business user policy unchanged
-- "Business user can view own data_requests" - business_id = get_my_business_id()

DROP POLICY IF EXISTS "Admin can insert data_requests" ON public.data_requests;
CREATE POLICY "Admin can insert data_requests" ON public.data_requests
  FOR INSERT WITH CHECK (
    public.is_admin()
    AND (
      get_my_org_id() IS NULL
      OR business_id IN (
        SELECT id FROM public.businesses WHERE organisation_id = get_my_org_id()
      )
    )
  );

DROP POLICY IF EXISTS "Admin can update data_requests" ON public.data_requests;
CREATE POLICY "Admin can update data_requests" ON public.data_requests
  FOR UPDATE USING (
    public.is_admin()
    AND (
      get_my_org_id() IS NULL
      OR business_id IN (
        SELECT id FROM public.businesses WHERE organisation_id = get_my_org_id()
      )
    )
  );

DROP POLICY IF EXISTS "Admin can delete data_requests" ON public.data_requests;
CREATE POLICY "Admin can delete data_requests" ON public.data_requests
  FOR DELETE USING (
    public.is_admin()
    AND (
      get_my_org_id() IS NULL
      OR business_id IN (
        SELECT id FROM public.businesses WHERE organisation_id = get_my_org_id()
      )
    )
  );


-- ============================================
-- 10. COMPANY_SUBMISSIONS TABLE - Scope by org via data_requests -> businesses
-- ============================================
-- company_submissions.data_request_id -> data_requests.business_id -> businesses.organisation_id
-- The INSERT policy ("Anyone can insert submissions") stays permissive (magic link flow).

DROP POLICY IF EXISTS "Admin can view all submissions" ON public.company_submissions;
CREATE POLICY "Admin can view all submissions" ON public.company_submissions
  FOR SELECT USING (
    public.is_admin()
    AND (
      get_my_org_id() IS NULL
      OR data_request_id IN (
        SELECT dr.id FROM public.data_requests dr
        JOIN public.businesses b ON dr.business_id = b.id
        WHERE b.organisation_id = get_my_org_id()
      )
    )
  );

-- Business user policy unchanged
-- "Business user can view own submissions" - via data_requests.business_id

DROP POLICY IF EXISTS "Admin can update submissions" ON public.company_submissions;
CREATE POLICY "Admin can update submissions" ON public.company_submissions
  FOR UPDATE USING (
    public.is_admin()
    AND (
      get_my_org_id() IS NULL
      OR data_request_id IN (
        SELECT dr.id FROM public.data_requests dr
        JOIN public.businesses b ON dr.business_id = b.id
        WHERE b.organisation_id = get_my_org_id()
      )
    )
  );

DROP POLICY IF EXISTS "Admin can delete submissions" ON public.company_submissions;
CREATE POLICY "Admin can delete submissions" ON public.company_submissions
  FOR DELETE USING (
    public.is_admin()
    AND (
      get_my_org_id() IS NULL
      OR data_request_id IN (
        SELECT dr.id FROM public.data_requests dr
        JOIN public.businesses b ON dr.business_id = b.id
        WHERE b.organisation_id = get_my_org_id()
      )
    )
  );

-- "Anyone can insert submissions" - no change (magic link flow, token validated in app)
-- "Anyone can update submissions" - no change (magic link flow)
-- "Business user can update own submissions" - no change (scoped by business_id)


-- ============================================
-- 11. ACTIONS TABLE - Scope by org via businesses
-- ============================================
-- actions.business_id -> businesses.organisation_id

DROP POLICY IF EXISTS "Admin can view all actions" ON public.actions;
CREATE POLICY "Admin can view all actions" ON public.actions
  FOR SELECT USING (
    public.is_admin()
    AND (
      get_my_org_id() IS NULL
      OR business_id IN (
        SELECT id FROM public.businesses WHERE organisation_id = get_my_org_id()
      )
    )
  );

-- Business user policy unchanged
-- "Business user can view own actions" - business_id = get_my_business_id()

DROP POLICY IF EXISTS "Admin can insert actions" ON public.actions;
CREATE POLICY "Admin can insert actions" ON public.actions
  FOR INSERT WITH CHECK (
    public.is_admin()
    AND (
      get_my_org_id() IS NULL
      OR business_id IN (
        SELECT id FROM public.businesses WHERE organisation_id = get_my_org_id()
      )
    )
  );

DROP POLICY IF EXISTS "Admin can update actions" ON public.actions;
CREATE POLICY "Admin can update actions" ON public.actions
  FOR UPDATE USING (
    public.is_admin()
    AND (
      get_my_org_id() IS NULL
      OR business_id IN (
        SELECT id FROM public.businesses WHERE organisation_id = get_my_org_id()
      )
    )
  );

DROP POLICY IF EXISTS "Admin can delete actions" ON public.actions;
CREATE POLICY "Admin can delete actions" ON public.actions
  FOR DELETE USING (
    public.is_admin()
    AND (
      get_my_org_id() IS NULL
      OR business_id IN (
        SELECT id FROM public.businesses WHERE organisation_id = get_my_org_id()
      )
    )
  );


-- ============================================
-- 12. COMPANY_EMAILS TABLE - Scope by org via businesses
-- ============================================
-- company_emails.business_id -> businesses.organisation_id
-- Note: The JWT hook reads company_emails as SECURITY DEFINER, so RLS
-- does not apply during hook execution.

DROP POLICY IF EXISTS "Admin can view all company_emails" ON public.company_emails;
CREATE POLICY "Admin can view all company_emails" ON public.company_emails
  FOR SELECT USING (
    public.is_admin()
    AND (
      get_my_org_id() IS NULL
      OR business_id IN (
        SELECT id FROM public.businesses WHERE organisation_id = get_my_org_id()
      )
    )
  );

-- Business user policy unchanged
-- "Business user can view own company_emails" - business_id = get_my_business_id()

DROP POLICY IF EXISTS "Admin can insert company_emails" ON public.company_emails;
CREATE POLICY "Admin can insert company_emails" ON public.company_emails
  FOR INSERT WITH CHECK (
    public.is_admin()
    AND (
      get_my_org_id() IS NULL
      OR business_id IN (
        SELECT id FROM public.businesses WHERE organisation_id = get_my_org_id()
      )
    )
  );

DROP POLICY IF EXISTS "Admin can update company_emails" ON public.company_emails;
CREATE POLICY "Admin can update company_emails" ON public.company_emails
  FOR UPDATE USING (
    public.is_admin()
    AND (
      get_my_org_id() IS NULL
      OR business_id IN (
        SELECT id FROM public.businesses WHERE organisation_id = get_my_org_id()
      )
    )
  );

DROP POLICY IF EXISTS "Admin can delete company_emails" ON public.company_emails;
CREATE POLICY "Admin can delete company_emails" ON public.company_emails
  FOR DELETE USING (
    public.is_admin()
    AND (
      get_my_org_id() IS NULL
      OR business_id IN (
        SELECT id FROM public.businesses WHERE organisation_id = get_my_org_id()
      )
    )
  );


-- ============================================
-- 13. SECTORS TABLE - No change needed
-- ============================================
-- Sectors are global/shared across organisations.
-- "Anyone can view sectors" USING (true) stays as-is.
-- Admin write policies stay as-is (sectors are a global lookup table).


-- ============================================
-- 14. PROFILES TABLE - No change needed
-- ============================================
-- Profiles are scoped by auth.uid() (user can only see own profile).
-- No organisation column needed on profiles.


-- ============================================
-- NOTES FOR PHASE 23.3 (Next Steps)
-- ============================================
-- 1. Add organisation_id to admin_invitations table for direct org scoping
-- 2. Update Edge Functions to pass organisation_id when creating resources
-- 3. Update frontend to include organisation context in API calls
-- 4. Consider replacing global UNIQUE on admins(email) with composite
--    UNIQUE on (organisation_id, email) for cross-org admin support
-- 5. Update aggregate views (city_monthly_aggregate etc.) to filter by org
--    (currently they use SECURITY INVOKER so businesses RLS covers this,
--    but explicit org filtering in the view CTEs would be more efficient)
-- 6. Add organisation_id to targets table when it is created
