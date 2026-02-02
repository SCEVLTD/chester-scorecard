-- Chester Business Scorecard - Authentication Schema
-- Migration: 20260202_add_auth_schema
-- Purpose: Add profiles table, auth hook, and helper functions for multi-tenant auth

-- =============================================================================
-- 1. PROFILES TABLE - Links auth.users to businesses
-- =============================================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'business_user' CHECK (role IN ('admin', 'business_user')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. TRIGGER - Auto-create profile when user signs up
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 3. AUTH HOOK - Add role and business_id to JWT claims
-- =============================================================================
-- NOTE: After running this migration, you must enable the hook in Supabase Dashboard:
--   Authentication > Hooks > Custom Access Token > select custom_access_token_hook

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE
  claims JSONB;
  user_role TEXT;
  user_business_id UUID;
BEGIN
  SELECT role, business_id INTO user_role, user_business_id
  FROM public.profiles
  WHERE id = (event->>'user_id')::UUID;

  claims := event->'claims';

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"business_user"');
  END IF;

  IF user_business_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{business_id}', to_jsonb(user_business_id));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- =============================================================================
-- 4. HELPER FUNCTIONS - For use in RLS policies
-- =============================================================================

CREATE OR REPLACE FUNCTION auth.business_id()
RETURNS UUID AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb->>'business_id',
    ''
  )::UUID
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'user_role' = 'admin',
    false
  )
$$ LANGUAGE sql STABLE;

-- =============================================================================
-- 5. RLS POLICIES FOR PROFILES
-- =============================================================================

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id OR auth.is_admin());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
