-- Phase 18: Rate Limiting & Abuse Prevention
-- Creates rate_limits table, atomic increment RPC, and cleanup function

-- Rate limits table
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer DEFAULT 1,
  UNIQUE(user_id, action, window_start)
);

-- Enable RLS (Edge Functions use service role key, so no user-level policies needed)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow super_admin to read rate limits for monitoring
CREATE POLICY "super_admin_read_rate_limits" ON public.rate_limits
  FOR SELECT
  USING (
    COALESCE(
      current_setting('request.jwt.claims', true)::jsonb->>'user_role',
      ''
    ) = 'super_admin'
  );

-- Fast lookup index
CREATE INDEX idx_rate_limits_lookup
  ON public.rate_limits (user_id, action, window_start);

-- Atomic increment function (avoids race conditions)
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_user_id uuid,
  p_action text,
  p_window_start timestamptz
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
BEGIN
  INSERT INTO public.rate_limits (user_id, action, window_start, count)
  VALUES (p_user_id, p_action, p_window_start, 1)
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE SET count = rate_limits.count + 1
  RETURNING count INTO current_count;

  RETURN current_count;
END;
$$;

-- Cleanup function to remove stale entries (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '24 hours';
$$;
