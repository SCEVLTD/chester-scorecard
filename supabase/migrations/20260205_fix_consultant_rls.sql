-- Fix RLS for consultant role
-- Migration: 20260205_fix_consultant_rls
-- Problem: is_admin() only checks for 'admin' role, but consultants have 'consultant' role
-- This blocks consultants from viewing company_submissions (which has qualitative insights)
--
-- Solution: Update is_admin() to return true for both 'super_admin' and 'consultant'
-- Financial data filtering happens at the application layer (React components)

-- Update the is_admin function to include consultant role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'user_role' IN ('admin', 'super_admin', 'consultant'),
    false
  )
$$ LANGUAGE sql STABLE;

-- Note: This allows consultants to query all the same tables as super_admins at the RLS level.
-- The difference in data visibility (consultants can't see £ values) is enforced in the
-- React components:
--   - src/components/submitted-financials-display.tsx (returns null for consultant)
--   - src/pages/company-performance.tsx (hides YTD cards and monthly detail)
--   - src/pages/charts.tsx (shows percentage scores, not £ values)
--   - AI analysis generates consultant-specific version without £ figures
