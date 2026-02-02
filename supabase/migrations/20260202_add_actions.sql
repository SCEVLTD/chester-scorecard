-- Chester Business Scorecard - Actions Table
-- Migration: 20260202_add_actions
-- Purpose: Create actions table for tracking meeting action items
--
-- CRITICAL: RLS must be enabled immediately after table creation to prevent
-- security vulnerabilities (see 06-RESEARCH.md pitfall #3)

-- ============================================
-- ACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  description text NOT NULL,
  owner text NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'complete')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_by text
);

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================
-- Index for fetching actions by business and status (common query pattern)
CREATE INDEX idx_actions_business_status ON actions(business_id, status);

-- Partial index for pending actions by due date (dashboard/overdue queries)
CREATE INDEX idx_actions_due_date ON actions(due_date) WHERE status = 'pending';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
-- CRITICAL: Enable RLS immediately after table creation
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- Following existing pattern from 20260202_add_rls_policies.sql
-- Uses public.is_admin() and public.get_my_business_id() helper functions
-- ============================================

-- Admin can view all actions
CREATE POLICY "Admin can view all actions" ON actions
  FOR SELECT USING (public.is_admin());

-- Admin can insert actions
CREATE POLICY "Admin can insert actions" ON actions
  FOR INSERT WITH CHECK (public.is_admin());

-- Admin can update actions
CREATE POLICY "Admin can update actions" ON actions
  FOR UPDATE USING (public.is_admin());

-- Admin can delete actions
CREATE POLICY "Admin can delete actions" ON actions
  FOR DELETE USING (public.is_admin());

-- Business user can view only their own actions
CREATE POLICY "Business user can view own actions" ON actions
  FOR SELECT USING (business_id = public.get_my_business_id());
