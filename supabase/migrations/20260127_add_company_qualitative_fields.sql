-- Add qualitative input fields to company_submissions
-- Allows company to provide additional context for consultant

ALTER TABLE company_submissions
ADD COLUMN net_profit_override BOOLEAN DEFAULT FALSE,
ADD COLUMN company_biggest_opportunity TEXT,
ADD COLUMN company_biggest_risk TEXT,
ADD COLUMN company_challenges TEXT,
ADD COLUMN company_wins TEXT;

-- Add comment for documentation
COMMENT ON COLUMN company_submissions.net_profit_override IS 'True if user manually overrode the auto-calculated net profit';
COMMENT ON COLUMN company_submissions.company_biggest_opportunity IS 'Company view: biggest opportunity in next 90 days';
COMMENT ON COLUMN company_submissions.company_biggest_risk IS 'Company view: biggest risk they see';
COMMENT ON COLUMN company_submissions.company_challenges IS 'Company view: current challenges they are facing';
COMMENT ON COLUMN company_submissions.company_wins IS 'Company view: recent wins or positive developments';
