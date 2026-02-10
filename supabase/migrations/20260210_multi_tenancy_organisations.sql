-- ============================================
-- Phase 23.1: Multi-Tenancy - Organisations Table & Backfill
-- Migration: 20260210_multi_tenancy_organisations
-- Applied: 2026-02-10
--
-- Purpose: Lay the database groundwork for multi-tenancy by creating an
-- organisations table and linking existing tables to it. All existing data
-- is backfilled to a default "Chester" organisation. This migration does NOT
-- update existing RLS policies on other tables (that is Phase 23.2).
--
-- Tables affected:
--   NEW: organisations
--   ALTERED: businesses, admins, invitations, meetings, audit_log
--   SKIPPED: targets (table does not exist yet - add org_id when targets is created)
--   SKIPPED: scorecards, data_requests, company_submissions (inherit org via businesses FK)
--
-- Idempotency: Uses IF NOT EXISTS, DO $$ blocks, and ON CONFLICT where possible.
-- ============================================


-- ============================================
-- 1. CREATE ORGANISATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  settings jsonb DEFAULT '{}',
  branding jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Performance index on slug (used for URL-based org lookups)
CREATE INDEX IF NOT EXISTS idx_organisations_slug ON public.organisations (slug);

-- Enable RLS immediately after creation
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

-- Grant authenticated users SELECT (RLS policies control who sees what)
GRANT SELECT, INSERT, UPDATE ON public.organisations TO authenticated;

-- Service role bypass (Edge Functions need full access)
DROP POLICY IF EXISTS "Service role bypass for organisations" ON public.organisations;
CREATE POLICY "Service role bypass for organisations"
  ON public.organisations FOR ALL
  USING (auth.role() = 'service_role');


-- ============================================
-- 2. ADD organisation_id TO EXISTING TABLES
-- ============================================
-- All columns are nullable initially to allow the backfill step.
-- After backfill, businesses and admins are made NOT NULL.

-- 2a. businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organisations(id) ON DELETE RESTRICT;

-- 2b. admins
ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organisations(id) ON DELETE RESTRICT;

-- 2c. invitations
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organisations(id) ON DELETE RESTRICT;

-- 2d. meetings
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organisations(id) ON DELETE RESTRICT;

-- 2e. audit_log (permanently nullable - system-level logs have no org)
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organisations(id) ON DELETE RESTRICT;


-- ============================================
-- 3. CREATE DEFAULT "CHESTER" ORGANISATION & BACKFILL
-- ============================================

-- Insert the default Chester organisation with a well-known UUID
-- ON CONFLICT handles re-runs (idempotent)
INSERT INTO public.organisations (id, name, slug, settings, branding)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Chester Brethren Business Group',
  'chester',
  '{"city": "Chester", "country": "GB"}',
  '{}'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  settings = EXCLUDED.settings;

-- Backfill all existing rows that don't yet have an organisation
UPDATE public.businesses
  SET organisation_id = 'a0000000-0000-0000-0000-000000000001'
  WHERE organisation_id IS NULL;

UPDATE public.admins
  SET organisation_id = 'a0000000-0000-0000-0000-000000000001'
  WHERE organisation_id IS NULL;

UPDATE public.invitations
  SET organisation_id = 'a0000000-0000-0000-0000-000000000001'
  WHERE organisation_id IS NULL;

UPDATE public.meetings
  SET organisation_id = 'a0000000-0000-0000-0000-000000000001'
  WHERE organisation_id IS NULL;

UPDATE public.audit_log
  SET organisation_id = 'a0000000-0000-0000-0000-000000000001'
  WHERE organisation_id IS NULL;


-- ============================================
-- 4. ENFORCE NOT NULL ON CORE TABLES
-- ============================================
-- After backfill, businesses and admins must always have an org.
-- invitations, meetings are also enforced (all current data is Chester).
-- audit_log stays nullable (system logs may not have an org context).

DO $$
BEGIN
  -- businesses: set NOT NULL if not already
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'businesses'
      AND column_name = 'organisation_id'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.businesses ALTER COLUMN organisation_id SET NOT NULL;
  END IF;

  -- admins: set NOT NULL if not already
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'admins'
      AND column_name = 'organisation_id'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.admins ALTER COLUMN organisation_id SET NOT NULL;
  END IF;

  -- invitations: set NOT NULL if not already
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invitations'
      AND column_name = 'organisation_id'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.invitations ALTER COLUMN organisation_id SET NOT NULL;
  END IF;

  -- meetings: set NOT NULL if not already
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'meetings'
      AND column_name = 'organisation_id'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.meetings ALTER COLUMN organisation_id SET NOT NULL;
  END IF;

  -- audit_log: intentionally left nullable
END;
$$;


-- ============================================
-- 5. CREATE INDEXES ON organisation_id
-- ============================================
-- These support efficient filtering by organisation across all tenant-scoped tables.

CREATE INDEX IF NOT EXISTS idx_businesses_organisation
  ON public.businesses (organisation_id);

CREATE INDEX IF NOT EXISTS idx_admins_organisation
  ON public.admins (organisation_id);

CREATE INDEX IF NOT EXISTS idx_invitations_organisation
  ON public.invitations (organisation_id);

CREATE INDEX IF NOT EXISTS idx_meetings_organisation
  ON public.meetings (organisation_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_organisation
  ON public.audit_log (organisation_id);


-- ============================================
-- 6. HELPER FUNCTION: get_my_org_id()
-- ============================================
-- Extracts organisation_id from the JWT custom claims.
-- Returns NULL if the claim is not present (e.g. system calls, anon).
-- The custom_access_token_hook will be updated in Phase 23.2 to inject
-- organisation_id into JWT claims. Until then, this returns NULL.

CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    NULLIF(
      current_setting('request.jwt.claims', true)::jsonb->>'organisation_id',
      ''
    )::uuid,
    NULL
  )
$$ LANGUAGE sql STABLE SET search_path = public;

-- Grant to authenticated (mirrors pattern from get_my_business_id)
GRANT EXECUTE ON FUNCTION public.get_my_org_id TO authenticated;


-- ============================================
-- 7. RLS POLICIES FOR ORGANISATIONS TABLE
-- ============================================
-- Phase 23.1 scope: basic access control.
-- super_admin and consultant can see orgs they belong to.
-- super_admin can update their own org's settings/branding.
-- Future Phase: platform_admin role for cross-org management.

-- SELECT: super_admin and consultant can see organisations they belong to
-- (determined by matching their admins.organisation_id to organisations.id)
DROP POLICY IF EXISTS "Admins can view their organisation" ON public.organisations;
CREATE POLICY "Admins can view their organisation"
  ON public.organisations
  FOR SELECT
  USING (
    -- super_admin or consultant can see the org they belong to
    (public.is_admin() AND id IN (
      SELECT a.organisation_id FROM public.admins a
      WHERE LOWER(a.email) = LOWER(current_setting('request.jwt.claims', true)::jsonb->>'email')
    ))
    -- Also allow business users to see their org (via businesses table)
    OR id IN (
      SELECT b.organisation_id FROM public.businesses b
      WHERE b.id = public.get_my_business_id()
    )
  );

-- UPDATE: only super_admin can update their organisation
DROP POLICY IF EXISTS "Super admins can update their organisation" ON public.organisations;
CREATE POLICY "Super admins can update their organisation"
  ON public.organisations
  FOR UPDATE
  USING (
    public.is_super_admin() AND id IN (
      SELECT a.organisation_id FROM public.admins a
      WHERE LOWER(a.email) = LOWER(current_setting('request.jwt.claims', true)::jsonb->>'email')
    )
  )
  WITH CHECK (
    public.is_super_admin() AND id IN (
      SELECT a.organisation_id FROM public.admins a
      WHERE LOWER(a.email) = LOWER(current_setting('request.jwt.claims', true)::jsonb->>'email')
    )
  );

-- No INSERT policy for regular users - orgs are created by platform admin or service role
-- No DELETE policy - orgs should never be deleted (soft-delete in future if needed)


-- ============================================
-- 8. AUTO-UPDATE updated_at TRIGGER
-- ============================================
-- Keeps organisations.updated_at current on any modification.

CREATE OR REPLACE FUNCTION public.update_organisations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_organisations_updated_at ON public.organisations;
CREATE TRIGGER trg_organisations_updated_at
  BEFORE UPDATE ON public.organisations
  FOR EACH ROW EXECUTE FUNCTION public.update_organisations_updated_at();


-- ============================================
-- 9. UNIQUE CONSTRAINT: admins email per org
-- ============================================
-- An admin email must be unique within an organisation, but the same person
-- could theoretically be an admin in multiple organisations.
-- The existing UNIQUE on admins(email) may conflict - we add a composite
-- unique constraint for the multi-tenant future but leave the original
-- for now to avoid breaking existing code. Phase 23.2 will handle this.

-- For now, just add a composite index (not unique yet) for query performance
CREATE INDEX IF NOT EXISTS idx_admins_org_email
  ON public.admins (organisation_id, email);


-- ============================================
-- NOTES FOR PHASE 23.2 (Next Steps)
-- ============================================
-- 1. Update custom_access_token_hook to inject organisation_id into JWT claims
-- 2. Update RLS policies on businesses, admins, invitations, meetings, audit_log
--    to filter by organisation_id (using get_my_org_id() helper)
-- 3. Update existing RLS policies to scope data access per organisation
-- 4. Consider removing the global UNIQUE on admins(email) and replacing with
--    a composite UNIQUE on (organisation_id, email)
-- 5. Add organisation_id to targets table when it is created
-- 6. Update frontend to pass organisation context
