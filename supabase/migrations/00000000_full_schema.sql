-- Chester Business Scorecard - Full Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/hknwkqhckdmosarywaio/sql

-- Create sectors table
CREATE TABLE IF NOT EXISTS sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Insert default UK SME sectors
INSERT INTO sectors (name) VALUES
  ('Agriculture & Farming'),
  ('Construction & Trades'),
  ('Food & Hospitality'),
  ('Healthcare & Social Care'),
  ('Manufacturing'),
  ('Professional Services'),
  ('Property & Real Estate'),
  ('Retail & E-commerce'),
  ('Technology & Digital'),
  ('Tourism & Leisure'),
  ('Transport & Logistics'),
  ('Wholesale & Distribution')
ON CONFLICT (name) DO NOTHING;

-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sector_id uuid REFERENCES sectors(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create scorecards table
CREATE TABLE IF NOT EXISTS scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  month text NOT NULL,
  consultant_name text NOT NULL,
  -- Financial variances
  revenue_variance numeric,
  gross_profit_variance numeric,
  overheads_variance numeric,
  net_profit_variance numeric,
  -- People/HR
  productivity_benchmark numeric,
  productivity_actual numeric,
  leadership text,
  -- Market
  market_demand text,
  marketing text,
  -- Product
  product_strength text,
  -- Suppliers
  supplier_strength text,
  -- Sales
  sales_execution text,
  -- Commentary (mandatory)
  biggest_opportunity text NOT NULL,
  biggest_risk text NOT NULL,
  management_avoiding text NOT NULL,
  leadership_confidence text NOT NULL,
  consultant_gut_feel text NOT NULL,
  -- Computed
  total_score integer NOT NULL,
  rag_status text NOT NULL,
  -- AI Analysis
  ai_analysis jsonb,
  ai_analysis_generated_at timestamptz,
  -- Company submission link
  company_submission_id uuid,
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_id, month)
);

-- Create data_requests table
CREATE TABLE IF NOT EXISTS data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  month text NOT NULL,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'used')),
  expires_at timestamptz NOT NULL,
  created_by text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_id, month)
);

-- Create company_submissions table
CREATE TABLE IF NOT EXISTS company_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_request_id uuid NOT NULL UNIQUE REFERENCES data_requests(id) ON DELETE CASCADE,
  -- Financial data
  revenue_actual numeric NOT NULL,
  revenue_target numeric NOT NULL,
  gross_profit_actual numeric NOT NULL,
  gross_profit_target numeric NOT NULL,
  overheads_actual numeric NOT NULL,
  overheads_budget numeric NOT NULL,
  net_profit_actual numeric NOT NULL,
  net_profit_target numeric NOT NULL,
  net_profit_override boolean DEFAULT false,
  total_wages numeric NOT NULL,
  productivity_benchmark numeric NOT NULL,
  -- Qualitative inputs from company
  company_biggest_opportunity text,
  company_biggest_risk text,
  company_challenges text,
  company_wins text,
  -- Metadata
  submitted_at timestamptz DEFAULT now(),
  submitted_by_name text,
  submitted_by_email text
);

-- Add FK from scorecards to company_submissions
ALTER TABLE scorecards
ADD CONSTRAINT scorecards_company_submission_id_fkey
FOREIGN KEY (company_submission_id) REFERENCES company_submissions(id) ON DELETE SET NULL;

-- Enable RLS on all tables
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for anon access (public access for MVP)
CREATE POLICY "Allow all access to sectors" ON sectors FOR ALL USING (true);
CREATE POLICY "Allow all access to businesses" ON businesses FOR ALL USING (true);
CREATE POLICY "Allow all access to scorecards" ON scorecards FOR ALL USING (true);
CREATE POLICY "Allow all access to data_requests" ON data_requests FOR ALL USING (true);
CREATE POLICY "Allow all access to company_submissions" ON company_submissions FOR ALL USING (true);
