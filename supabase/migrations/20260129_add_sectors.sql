-- Create sectors table for UK SME business categorization
-- Run this migration via Supabase dashboard or MCP

-- Create sectors table
CREATE TABLE IF NOT EXISTS sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed UK SME sector categories
INSERT INTO sectors (name) VALUES
  ('Manufacturing'),
  ('Professional Services'),
  ('Technology'),
  ('Construction'),
  ('Retail'),
  ('Hospitality'),
  ('Healthcare'),
  ('Education & Training'),
  ('Transport & Logistics'),
  ('Financial Services'),
  ('Creative & Media'),
  ('Other')
ON CONFLICT (name) DO NOTHING;

-- Add sector_id foreign key to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS sector_id UUID REFERENCES sectors(id);
