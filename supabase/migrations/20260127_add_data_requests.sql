-- Create data_requests table for magic link tokens
CREATE TABLE data_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(business_id, month)
);

-- Index for fast token lookups (magic link validation)
CREATE INDEX idx_data_requests_token ON data_requests(token);

-- Index for business lookups
CREATE INDEX idx_data_requests_business_id ON data_requests(business_id);

-- RLS policies (permissive for now - no auth)
ALTER TABLE data_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to data_requests"
  ON data_requests FOR ALL
  USING (true)
  WITH CHECK (true);
