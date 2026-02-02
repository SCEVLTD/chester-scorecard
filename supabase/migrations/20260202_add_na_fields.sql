-- Add N/A (Not Applicable) fields to company_submissions
-- Allows businesses to mark sections as not applicable to them
-- (e.g., one-person businesses may not have meaningful wages data)

ALTER TABLE company_submissions
ADD COLUMN IF NOT EXISTS revenue_na BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gross_profit_na BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS overheads_na BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS wages_na BOOLEAN DEFAULT false;

-- Make financial fields nullable when N/A is true
-- Revenue fields
ALTER TABLE company_submissions
ALTER COLUMN revenue_actual DROP NOT NULL,
ALTER COLUMN revenue_target DROP NOT NULL;

-- Gross profit fields
ALTER TABLE company_submissions
ALTER COLUMN gross_profit_actual DROP NOT NULL,
ALTER COLUMN gross_profit_target DROP NOT NULL;

-- Overheads fields
ALTER TABLE company_submissions
ALTER COLUMN overheads_actual DROP NOT NULL,
ALTER COLUMN overheads_budget DROP NOT NULL;

-- Net profit fields (auto-calculated, also nullable)
ALTER TABLE company_submissions
ALTER COLUMN net_profit_actual DROP NOT NULL,
ALTER COLUMN net_profit_target DROP NOT NULL;

-- Wages/Productivity fields
ALTER TABLE company_submissions
ALTER COLUMN total_wages DROP NOT NULL,
ALTER COLUMN productivity_benchmark DROP NOT NULL;

-- Add comment explaining N/A usage
COMMENT ON COLUMN company_submissions.revenue_na IS 'True if revenue data is not applicable to this business';
COMMENT ON COLUMN company_submissions.gross_profit_na IS 'True if gross profit data is not applicable to this business';
COMMENT ON COLUMN company_submissions.overheads_na IS 'True if overheads data is not applicable to this business';
COMMENT ON COLUMN company_submissions.wages_na IS 'True if wages/productivity data is not applicable to this business';
