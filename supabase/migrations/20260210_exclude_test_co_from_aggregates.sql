-- ============================================
-- Exclude TEST CO from aggregate reporting views
-- Migration: exclude_test_co_from_aggregates
-- Applied: 2026-02-10
--
-- Adds exclude_from_reporting flag to businesses table and
-- recreates aggregate views to filter out flagged businesses.
-- TEST CO (b04b0b75-a406-41a4-9b98-9fc20ab0802e) is a test
-- business that should not appear in any reporting data.
-- ============================================

-- 1. Add flag column
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS exclude_from_reporting boolean NOT NULL DEFAULT false;

-- 2. Flag TEST CO
UPDATE public.businesses
  SET exclude_from_reporting = true
  WHERE id = 'b04b0b75-a406-41a4-9b98-9fc20ab0802e';

-- 3. Recreate city_monthly_aggregate with exclusion filter
CREATE OR REPLACE VIEW public.city_monthly_aggregate AS
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
  WHERE b.exclude_from_reporting = false
)
SELECT
  month,
  COUNT(DISTINCT business_id) AS business_count,
  COUNT(DISTINCT CASE WHEN ebitda_actual IS NOT NULL AND ebitda_actual != 0 THEN business_id END) AS businesses_with_ebitda,
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
    WHEN SUM(ebitda_target) > 0
    THEN ROUND(((SUM(ebitda_actual) - SUM(ebitda_target)) / SUM(ebitda_target) * 100)::numeric, 1)
    ELSE NULL
  END AS ebitda_variance_pct,
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
  COUNT(DISTINCT CASE WHEN e_profile = 'E0' THEN business_id END) AS e0_count,
  COUNT(DISTINCT CASE WHEN e_profile = 'E1' THEN business_id END) AS e1_count,
  COUNT(DISTINCT CASE WHEN e_profile = 'E2' THEN business_id END) AS e2_count,
  COUNT(DISTINCT CASE WHEN e_profile = 'E3' THEN business_id END) AS e3_count,
  COUNT(DISTINCT CASE WHEN e_profile = 'E4' THEN business_id END) AS e4_count,
  COUNT(DISTINCT CASE WHEN e_profile = 'E5' THEN business_id END) AS e5_count
FROM monthly_data
GROUP BY month
ORDER BY month DESC;

-- 4. Recreate eprofile_monthly_aggregate with exclusion filter
CREATE OR REPLACE VIEW public.eprofile_monthly_aggregate AS
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
  WHERE b.e_profile IS NOT NULL AND b.exclude_from_reporting = false
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

-- 5. Recreate city_ytd_aggregate with exclusion filter
CREATE OR REPLACE VIEW public.city_ytd_aggregate AS
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
  WHERE b.exclude_from_reporting = false
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

-- 6. Ensure views remain SECURITY DEFINER (not INVOKER)
ALTER VIEW public.city_monthly_aggregate SET (security_invoker = false);
ALTER VIEW public.city_ytd_aggregate SET (security_invoker = false);
ALTER VIEW public.eprofile_monthly_aggregate SET (security_invoker = false);
