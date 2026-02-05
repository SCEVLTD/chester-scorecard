-- Create view for city-wide aggregate financial data
-- Used by the City Dashboard to show Chester group totals
-- This view aggregates monthly revenue and EBITDA across all businesses

-- Note: net_profit_actual/target contains EBITDA data (per existing data structure)

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

-- Create view for E-Profile aggregate reporting
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

-- Create view for YTD (Year-to-Date) aggregates by year
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

-- Grant access to authenticated users (RLS will handle visibility at query time)
-- All views show aggregate data only - no individual company names exposed
GRANT SELECT ON public.city_monthly_aggregate TO authenticated;
GRANT SELECT ON public.eprofile_monthly_aggregate TO authenticated;
GRANT SELECT ON public.city_ytd_aggregate TO authenticated;
