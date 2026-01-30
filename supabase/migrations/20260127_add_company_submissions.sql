-- Create company_submissions table for raw financial data
CREATE TABLE company_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_request_id UUID NOT NULL REFERENCES data_requests(id) ON DELETE CASCADE,

  -- Raw financial data (what company enters)
  revenue_actual DECIMAL(15,2) NOT NULL,
  revenue_target DECIMAL(15,2) NOT NULL,
  gross_profit_actual DECIMAL(15,2) NOT NULL,
  gross_profit_target DECIMAL(15,2) NOT NULL,
  overheads_actual DECIMAL(15,2) NOT NULL,
  overheads_budget DECIMAL(15,2) NOT NULL,
  net_profit_actual DECIMAL(15,2) NOT NULL,
  net_profit_target DECIMAL(15,2) NOT NULL,

  -- Productivity data
  total_wages DECIMAL(15,2) NOT NULL,
  productivity_benchmark DECIMAL(5,2) NOT NULL,

  -- Metadata
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_by_name VARCHAR(100),
  submitted_by_email VARCHAR(255),

  UNIQUE(data_request_id)
);

-- Index for data_request lookups
CREATE INDEX idx_company_submissions_request_id ON company_submissions(data_request_id);

-- Add company_submission_id to scorecards table
ALTER TABLE scorecards
ADD COLUMN company_submission_id UUID REFERENCES company_submissions(id);

-- RLS policies (permissive for now - no auth)
ALTER TABLE company_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to company_submissions"
  ON company_submissions FOR ALL
  USING (true)
  WITH CHECK (true);
