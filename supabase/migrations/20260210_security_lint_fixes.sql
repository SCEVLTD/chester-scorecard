-- ============================================
-- Security Lint Fixes
-- Migration: 20260210_security_lint_fixes
-- Applied: 2026-02-10
--
-- Fixes flagged by Supabase security advisor:
-- 1. Enable RLS on invitations table (policies exist but RLS was not enabled)
-- 2. Fix get_pending_submissions search_path (SECURITY DEFINER without search_path)
-- 3. Drop overly permissive admins INSERT/DELETE policies (replaced by super_admin policies)
-- 4. Fix invitations "Service role full access" policy (USING true applied to all roles)
-- ============================================


-- ============================================
-- 1. ENABLE RLS ON INVITATIONS TABLE
-- ============================================
-- Policies already exist from Phase 23.2, but RLS was never enabled.
-- Without RLS enabled, the policies have no effect.

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;


-- ============================================
-- 2. FIX get_pending_submissions SEARCH_PATH
-- ============================================
-- SECURITY DEFINER functions without explicit search_path are vulnerable
-- to search_path hijacking attacks.

CREATE OR REPLACE FUNCTION public.get_pending_submissions(target_month text)
RETURNS TABLE(business_id uuid, business_name text, user_email text, month text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (b.id)
    b.id AS business_id,
    b.name AS business_name,
    u.email AS user_email,
    target_month AS month
  FROM businesses b
  JOIN profiles p ON p.business_id = b.id
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN data_requests dr ON dr.business_id = b.id
    AND dr.month = target_month
    AND dr.status = 'submitted'
  WHERE dr.id IS NULL  -- No submitted request for this month
    AND u.email IS NOT NULL
    AND p.role = 'business_user';  -- Only notify business users, not admins
END;
$function$;


-- ============================================
-- 3. DROP OVERLY PERMISSIVE ADMINS POLICIES
-- ============================================
-- "Admins can delete admins" has USING (true) - any authenticated user can delete!
-- "Admins can insert admins" has no restrictions - any authenticated user can insert!
-- The proper "Super admins can delete/insert admins" policies already exist with
-- correct super_admin + org-scoped checks, so these permissive ones are redundant
-- and dangerous.

DROP POLICY IF EXISTS "Admins can delete admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can insert admins" ON public.admins;


-- ============================================
-- 4. FIX INVITATIONS SERVICE ROLE POLICY
-- ============================================
-- "Service role full access" used USING (true) which applies to ALL roles,
-- effectively bypassing RLS for everyone. Replace with proper service_role check.

DROP POLICY IF EXISTS "Service role full access" ON public.invitations;

CREATE POLICY "Service role bypass for invitations"
  ON public.invitations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
