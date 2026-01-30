-- Add AI analysis columns to scorecards table
-- Run this migration via Supabase dashboard or MCP

ALTER TABLE scorecards
ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_analysis_generated_at TIMESTAMPTZ DEFAULT NULL;
