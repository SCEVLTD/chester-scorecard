-- Migration: Make scorecard consultant commentary fields nullable
-- Purpose: Allow auto-creation of scorecards from company self-assessment submissions
-- without requiring consultant-specific fields

-- Make consultant commentary fields nullable for self-assessment scorecards
ALTER TABLE scorecards
  ALTER COLUMN consultant_name DROP NOT NULL,
  ALTER COLUMN biggest_opportunity DROP NOT NULL,
  ALTER COLUMN biggest_risk DROP NOT NULL,
  ALTER COLUMN management_avoiding DROP NOT NULL,
  ALTER COLUMN leadership_confidence DROP NOT NULL,
  ALTER COLUMN consultant_gut_feel DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN scorecards.consultant_name IS 'NULL for company self-assessments, set for consultant-created scorecards';
