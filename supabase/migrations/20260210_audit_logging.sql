-- Phase 19.3: Audit Logging Infrastructure
-- Enterprise compliance (SOC 2 / GDPR) - tracks who accessed what data, when

-- Audit log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,  -- nullable for system actions
  user_email text,
  user_role text,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,  -- text not uuid to support various ID formats
  metadata jsonb DEFAULT '{}',
  ip_address text,  -- stored as text for flexibility
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only super_admin can read audit logs
CREATE POLICY "Super admins can view audit logs"
  ON public.audit_log
  FOR SELECT
  USING (
    current_setting('request.jwt.claims', true)::jsonb->>'user_role' IN ('admin', 'super_admin')
  );

-- No INSERT policy for authenticated users - Edge Functions use service role key
-- No UPDATE or DELETE policies - audit logs are immutable

-- Indexes for common queries
CREATE INDEX idx_audit_log_user ON public.audit_log (user_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON public.audit_log (action, created_at DESC);
CREATE INDEX idx_audit_log_resource ON public.audit_log (resource_type, resource_id, created_at DESC);
CREATE INDEX idx_audit_log_created ON public.audit_log (created_at DESC);

-- Grant SELECT to authenticated (RLS handles who sees what)
GRANT SELECT ON public.audit_log TO authenticated;

-- Helper function to write audit logs from Edge Functions
CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_user_id uuid,
  p_user_email text,
  p_user_role text,
  p_action text,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}',
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.audit_log (
    user_id, user_email, user_role, action, resource_type,
    resource_id, metadata, ip_address, user_agent
  )
  VALUES (
    p_user_id, p_user_email, p_user_role, p_action, p_resource_type,
    p_resource_id, p_metadata, p_ip_address, p_user_agent
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;

-- Grant execute to service role (Edge Functions)
GRANT EXECUTE ON FUNCTION public.write_audit_log TO service_role;

-- Auto-cleanup: keep 90 days of logs
CREATE OR REPLACE FUNCTION public.cleanup_audit_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.audit_log WHERE created_at < now() - interval '90 days';
$$;
