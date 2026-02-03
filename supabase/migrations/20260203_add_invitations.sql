-- Invitations table for custom invitation flow
-- Tokens are stored as hashes, validated on password setup
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for token lookup (used during validation)
CREATE INDEX IF NOT EXISTS idx_invitations_token_hash ON invitations(token_hash);

-- Index for email lookup
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);

-- Prevent duplicate pending invitations for same email+business
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_pending
  ON invitations(email, business_id)
  WHERE status = 'pending';

-- RLS: Only admins can manage invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Drop if exists to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage invitations" ON invitations;

CREATE POLICY "Admins can manage invitations"
  ON invitations FOR ALL
  USING (public.is_admin());

-- Service role bypass for edge functions
DROP POLICY IF EXISTS "Service role bypass for invitations" ON invitations;

CREATE POLICY "Service role bypass for invitations"
  ON invitations FOR ALL
  USING (auth.role() = 'service_role');
