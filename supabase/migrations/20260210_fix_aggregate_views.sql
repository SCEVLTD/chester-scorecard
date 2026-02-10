-- ============================================
-- Fix Aggregate Views: Revert to SECURITY DEFINER
-- Migration: 20260210_fix_aggregate_views
-- Applied: 2026-02-10
--
-- Problem: Phase 17.2 changed these views to SECURITY INVOKER, which meant
-- business_users could only see their OWN data in the aggregates instead of
-- the full Chester group results. The "Chester Group Results" feature on the
-- company dashboard was broken - showing only single-business data.
--
-- Fix: Revert to SECURITY DEFINER. These views only return anonymised
-- aggregated data (totals, counts, percentages). No individual company data
-- is exposed. All authenticated users should see the group-wide results.
-- ============================================

ALTER VIEW public.city_monthly_aggregate SET (security_invoker = false);
ALTER VIEW public.city_ytd_aggregate SET (security_invoker = false);
ALTER VIEW public.eprofile_monthly_aggregate SET (security_invoker = false);
