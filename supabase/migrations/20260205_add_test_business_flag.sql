-- Add is_test flag to businesses table
-- Test businesses are excluded from all aggregate reports

ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS is_test boolean DEFAULT false;

-- Mark TEST CO as a test business
UPDATE businesses
SET is_test = true
WHERE LOWER(name) = 'test co'
   OR LOWER(contact_email) = 'contact@scottmarkham.com';

-- Recreate city_monthly_aggregate view to exclude test businesses
DROP VIEW IF EXISTS city_monthly_aggregate;

CREATE VIEW city_monthly_aggregate AS
SELECT
  TO_CHAR(DATE_TRUNC('month', (year || '-' || LPAD(month::text, 2, '0') || '-01')::date), 'YYYY-MM') as month,
  COUNT(DISTINCT cs.business_id) as business_count,
  COUNT(DISTINCT CASE WHEN cs.ebitda_actual IS NOT NULL THEN cs.business_id END) as businesses_with_ebitda,
  SUM(cs.revenue_actual) as total_revenue_actual,
  SUM(cs.revenue_target) as total_revenue_target,
  SUM(cs.ebitda_actual) as total_ebitda_actual,
  SUM(cs.ebitda_target) as total_ebitda_target,
  CASE
    WHEN SUM(cs.revenue_target) > 0
    THEN ((SUM(cs.revenue_actual) - SUM(cs.revenue_target)) / SUM(cs.revenue_target)) * 100
    ELSE NULL
  END as revenue_variance_pct,
  CASE
    WHEN SUM(cs.ebitda_target) > 0
    THEN ((SUM(cs.ebitda_actual) - SUM(cs.ebitda_target)) / SUM(cs.ebitda_target)) * 100
    ELSE NULL
  END as ebitda_variance_pct,
  CASE
    WHEN SUM(cs.revenue_actual) > 0
    THEN (SUM(cs.ebitda_actual) / SUM(cs.revenue_actual)) * 100
    ELSE NULL
  END as ebitda_pct_actual,
  CASE
    WHEN SUM(cs.revenue_target) > 0
    THEN (SUM(cs.ebitda_target) / SUM(cs.revenue_target)) * 100
    ELSE NULL
  END as ebitda_pct_target,
  COUNT(DISTINCT CASE WHEN b.e_profile = 'E0' THEN cs.business_id END) as e0_count,
  COUNT(DISTINCT CASE WHEN b.e_profile = 'E1' THEN cs.business_id END) as e1_count,
  COUNT(DISTINCT CASE WHEN b.e_profile = 'E2' THEN cs.business_id END) as e2_count,
  COUNT(DISTINCT CASE WHEN b.e_profile = 'E3' THEN cs.business_id END) as e3_count,
  COUNT(DISTINCT CASE WHEN b.e_profile = 'E4' THEN cs.business_id END) as e4_count,
  COUNT(DISTINCT CASE WHEN b.e_profile = 'E5' THEN cs.business_id END) as e5_count
FROM company_submissions cs
JOIN businesses b ON cs.business_id = b.id
WHERE (b.is_test IS NULL OR b.is_test = false)  -- Exclude test businesses
GROUP BY DATE_TRUNC('month', (year || '-' || LPAD(month::text, 2, '0') || '-01')::date)
ORDER BY month;

-- Recreate city_ytd_aggregate view to exclude test businesses
DROP VIEW IF EXISTS city_ytd_aggregate;

CREATE VIEW city_ytd_aggregate AS
SELECT
  year::text as year,
  COUNT(DISTINCT cs.business_id) as business_count,
  SUM(cs.revenue_actual) as total_revenue_actual,
  SUM(cs.revenue_target) as total_revenue_target,
  SUM(cs.ebitda_actual) as total_ebitda_actual,
  SUM(cs.ebitda_target) as total_ebitda_target
FROM company_submissions cs
JOIN businesses b ON cs.business_id = b.id
WHERE (b.is_test IS NULL OR b.is_test = false)  -- Exclude test businesses
GROUP BY year
ORDER BY year DESC;

-- Recreate eprofile_monthly_aggregate view to exclude test businesses
DROP VIEW IF EXISTS eprofile_monthly_aggregate;

CREATE VIEW eprofile_monthly_aggregate AS
SELECT
  TO_CHAR(DATE_TRUNC('month', (year || '-' || LPAD(month::text, 2, '0') || '-01')::date), 'YYYY-MM') as month,
  COALESCE(b.e_profile, 'Unknown') as e_profile,
  COUNT(DISTINCT cs.business_id) as business_count,
  SUM(cs.revenue_actual) as total_revenue_actual,
  SUM(cs.revenue_target) as total_revenue_target,
  SUM(cs.ebitda_actual) as total_ebitda_actual,
  SUM(cs.ebitda_target) as total_ebitda_target
FROM company_submissions cs
JOIN businesses b ON cs.business_id = b.id
WHERE (b.is_test IS NULL OR b.is_test = false)  -- Exclude test businesses
GROUP BY
  DATE_TRUNC('month', (year || '-' || LPAD(month::text, 2, '0') || '-01')::date),
  b.e_profile
ORDER BY month, e_profile;

-- Grant permissions
GRANT SELECT ON city_monthly_aggregate TO authenticated;
GRANT SELECT ON city_ytd_aggregate TO authenticated;
GRANT SELECT ON eprofile_monthly_aggregate TO authenticated;

-- Add comment
COMMENT ON COLUMN businesses.is_test IS 'Test businesses are excluded from all aggregate reports and city-wide statistics';
