-- Add is_test flag to businesses table
-- Test businesses are excluded from all aggregate reports

ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS is_test boolean DEFAULT false;

-- Mark TEST CO as a test business
UPDATE businesses
SET is_test = true
WHERE LOWER(name) = 'test co'
   OR LOWER(contact_email) = 'contact@scottmarkham.com';

-- Add comment
COMMENT ON COLUMN businesses.is_test IS 'Test businesses are excluded from all aggregate reports and city-wide statistics';

-- Recreate city_monthly_aggregate view to exclude test businesses
DROP VIEW IF EXISTS city_monthly_aggregate;

CREATE VIEW city_monthly_aggregate AS
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
    FROM company_submissions cs
    JOIN data_requests dr ON cs.data_request_id = dr.id
    JOIN businesses b ON dr.business_id = b.id
    WHERE (b.is_test IS NULL OR b.is_test = false)
)
SELECT
    month,
    count(DISTINCT business_id) AS business_count,
    count(DISTINCT CASE WHEN ebitda_actual IS NOT NULL AND ebitda_actual <> 0 THEN business_id ELSE NULL END) AS businesses_with_ebitda,
    COALESCE(sum(revenue_actual), 0) AS total_revenue_actual,
    COALESCE(sum(revenue_target), 0) AS total_revenue_target,
    COALESCE(sum(ebitda_actual), 0) AS total_ebitda_actual,
    COALESCE(sum(ebitda_target), 0) AS total_ebitda_target,
    CASE WHEN sum(revenue_target) > 0 THEN round((sum(revenue_actual) - sum(revenue_target)) / sum(revenue_target) * 100, 1) ELSE NULL END AS revenue_variance_pct,
    CASE WHEN sum(ebitda_target) > 0 THEN round((sum(ebitda_actual) - sum(ebitda_target)) / sum(ebitda_target) * 100, 1) ELSE NULL END AS ebitda_variance_pct,
    CASE WHEN sum(revenue_actual) > 0 THEN round(sum(ebitda_actual) / sum(revenue_actual) * 100, 1) ELSE NULL END AS ebitda_pct_actual,
    CASE WHEN sum(revenue_target) > 0 THEN round(sum(ebitda_target) / sum(revenue_target) * 100, 1) ELSE NULL END AS ebitda_pct_target,
    count(DISTINCT CASE WHEN e_profile = 'E0' THEN business_id ELSE NULL END) AS e0_count,
    count(DISTINCT CASE WHEN e_profile = 'E1' THEN business_id ELSE NULL END) AS e1_count,
    count(DISTINCT CASE WHEN e_profile = 'E2' THEN business_id ELSE NULL END) AS e2_count,
    count(DISTINCT CASE WHEN e_profile = 'E3' THEN business_id ELSE NULL END) AS e3_count,
    count(DISTINCT CASE WHEN e_profile = 'E4' THEN business_id ELSE NULL END) AS e4_count,
    count(DISTINCT CASE WHEN e_profile = 'E5' THEN business_id ELSE NULL END) AS e5_count
FROM monthly_data
GROUP BY month
ORDER BY month DESC;

-- Recreate city_ytd_aggregate view to exclude test businesses
DROP VIEW IF EXISTS city_ytd_aggregate;

CREATE VIEW city_ytd_aggregate AS
WITH yearly_data AS (
    SELECT
        SUBSTRING(dr.month FROM 1 FOR 4) AS year,
        b.id AS business_id,
        cs.revenue_actual,
        cs.revenue_target,
        cs.net_profit_actual AS ebitda_actual,
        cs.net_profit_target AS ebitda_target
    FROM company_submissions cs
    JOIN data_requests dr ON cs.data_request_id = dr.id
    JOIN businesses b ON dr.business_id = b.id
    WHERE (b.is_test IS NULL OR b.is_test = false)
)
SELECT
    year,
    count(DISTINCT business_id) AS business_count,
    COALESCE(sum(revenue_actual), 0) AS total_revenue_actual,
    COALESCE(sum(revenue_target), 0) AS total_revenue_target,
    COALESCE(sum(ebitda_actual), 0) AS total_ebitda_actual,
    COALESCE(sum(ebitda_target), 0) AS total_ebitda_target
FROM yearly_data
GROUP BY year
ORDER BY year DESC;

-- Recreate eprofile_monthly_aggregate view to exclude test businesses
DROP VIEW IF EXISTS eprofile_monthly_aggregate;

CREATE VIEW eprofile_monthly_aggregate AS
WITH monthly_data AS (
    SELECT
        dr.month,
        b.id AS business_id,
        COALESCE(b.e_profile, 'Unknown') AS e_profile,
        cs.revenue_actual,
        cs.revenue_target,
        cs.net_profit_actual AS ebitda_actual,
        cs.net_profit_target AS ebitda_target
    FROM company_submissions cs
    JOIN data_requests dr ON cs.data_request_id = dr.id
    JOIN businesses b ON dr.business_id = b.id
    WHERE (b.is_test IS NULL OR b.is_test = false)
)
SELECT
    month,
    e_profile,
    count(DISTINCT business_id) AS business_count,
    COALESCE(sum(revenue_actual), 0) AS total_revenue_actual,
    COALESCE(sum(revenue_target), 0) AS total_revenue_target,
    COALESCE(sum(ebitda_actual), 0) AS total_ebitda_actual,
    COALESCE(sum(ebitda_target), 0) AS total_ebitda_target
FROM monthly_data
GROUP BY month, e_profile
ORDER BY month, e_profile;

-- Grant permissions
GRANT SELECT ON city_monthly_aggregate TO authenticated;
GRANT SELECT ON city_ytd_aggregate TO authenticated;
GRANT SELECT ON eprofile_monthly_aggregate TO authenticated;
