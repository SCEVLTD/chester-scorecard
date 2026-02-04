-- Fix: Add SECURITY DEFINER to auth hook and grant table permissions
-- Migration: 20260204_fix_auth_hook_security
-- Purpose: Fix auth hook failing due to RLS blocking access when called by supabase_auth_admin
-- Applied: 2026-02-04
--
-- CRITICAL: The custom_access_token_hook runs as supabase_auth_admin role.
-- When tables have RLS enabled, the hook cannot read from them unless:
--   1. The function is SECURITY DEFINER (runs as owner, bypassing RLS), OR
--   2. supabase_auth_admin has explicit RLS policy allowing access
--
-- We use SECURITY DEFINER because it's the standard pattern for auth hooks.

-- Make the auth hook SECURITY DEFINER so it bypasses RLS
ALTER FUNCTION public.custom_access_token_hook(jsonb) SECURITY DEFINER;

-- Grant SELECT on tables the hook needs to read
-- (These grants were added manually but need to be in migrations for fresh deploys)
GRANT SELECT ON public.company_emails TO supabase_auth_admin;
GRANT SELECT ON public.businesses TO supabase_auth_admin;
GRANT SELECT ON public.admins TO supabase_auth_admin;
