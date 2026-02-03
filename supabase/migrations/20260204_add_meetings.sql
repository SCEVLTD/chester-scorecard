-- Chester Business Scorecard - Meetings Table
-- Migration: 20260204_add_meetings
-- Purpose: Persist meeting prep summaries with user notes (Granola-style UX)
--
-- CRITICAL: RLS must be enabled immediately after table creation

-- ============================================
-- MEETINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Meeting metadata
  title text NOT NULL,
  meeting_date date NOT NULL,
  meeting_type text NOT NULL DEFAULT 'friday_group'
    CHECK (meeting_type IN ('friday_group', 'one_on_one', 'quarterly_review', 'ad_hoc')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'finalized', 'archived')),

  -- Portfolio snapshot at meeting time (preserves point-in-time data)
  portfolio_snapshot jsonb NOT NULL,
  businesses_count int NOT NULL,
  month_analyzed text NOT NULL,

  -- AI-generated content (MeetingSummary schema)
  ai_summary jsonb NOT NULL,
  model_used text NOT NULL,

  -- User additions (Granola-style: user notes alongside AI)
  user_notes text,
  attendees text[],

  -- Metadata
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now(),
  finalized_at timestamptz,
  finalized_by text
);

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================
-- Index for listing meetings by date (most common query)
CREATE INDEX idx_meetings_date ON meetings(meeting_date DESC);

-- Index for filtering by status
CREATE INDEX idx_meetings_status ON meetings(status);

-- Index for filtering by type
CREATE INDEX idx_meetings_type ON meetings(meeting_type);

-- Full-text search index for searching across meetings
CREATE INDEX idx_meetings_search ON meetings USING gin(
  to_tsvector('english',
    coalesce(title, '') || ' ' ||
    coalesce(user_notes, '') || ' ' ||
    coalesce(ai_summary->>'healthSummary', '')
  )
);

-- ============================================
-- LINK ACTIONS TO MEETINGS
-- ============================================
-- Add meeting reference to actions table
ALTER TABLE actions ADD COLUMN IF NOT EXISTS meeting_id uuid REFERENCES meetings(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_actions_meeting ON actions(meeting_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
-- CRITICAL: Enable RLS immediately after table creation
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- Following existing pattern from actions table
-- Uses public.is_admin() helper function
-- ============================================

-- Admin can view all meetings
CREATE POLICY "Admin can view all meetings" ON meetings
  FOR SELECT USING (public.is_admin());

-- Admin can insert meetings
CREATE POLICY "Admin can insert meetings" ON meetings
  FOR INSERT WITH CHECK (public.is_admin());

-- Admin can update meetings
CREATE POLICY "Admin can update meetings" ON meetings
  FOR UPDATE USING (public.is_admin());

-- Admin can delete meetings
CREATE POLICY "Admin can delete meetings" ON meetings
  FOR DELETE USING (public.is_admin());

-- Consultant role can also view/manage meetings
CREATE POLICY "Consultant can view all meetings" ON meetings
  FOR SELECT USING (public.is_consultant());

CREATE POLICY "Consultant can insert meetings" ON meetings
  FOR INSERT WITH CHECK (public.is_consultant());

CREATE POLICY "Consultant can update meetings" ON meetings
  FOR UPDATE USING (public.is_consultant());
