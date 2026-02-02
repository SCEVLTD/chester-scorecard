-- Add Lead KPI columns to company_submissions table
-- These track activity metrics: Outbound Calls and First Orders/New Accounts

ALTER TABLE company_submissions
ADD COLUMN IF NOT EXISTS outbound_calls integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS first_orders integer DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN company_submissions.outbound_calls IS 'Number of outbound sales calls made this month';
COMMENT ON COLUMN company_submissions.first_orders IS 'Number of first orders / new accounts acquired this month';
