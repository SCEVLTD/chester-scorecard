-- Admin invitations table for sending setup links to new admins
CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'consultant' CHECK (role IN ('super_admin', 'consultant')),
  token_hash TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_admin_invitations_token_hash ON public.admin_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_email_status ON public.admin_invitations(email, status);

-- Enable RLS
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

-- Only super_admins can view/create invitations
CREATE POLICY "Super admins can view admin invitations" ON public.admin_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = current_setting('request.jwt.claims', true)::jsonb->>'email'
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can insert admin invitations" ON public.admin_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = current_setting('request.jwt.claims', true)::jsonb->>'email'
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update admin invitations" ON public.admin_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = current_setting('request.jwt.claims', true)::jsonb->>'email'
      AND role = 'super_admin'
    )
  );
