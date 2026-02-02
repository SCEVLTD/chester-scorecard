-- Create admins table for explicit admin user management
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write admins table (bootstrap problem solved by service role)
CREATE POLICY "Admins can read admins" ON public.admins
  FOR SELECT USING (true);

-- Add initial admin (replace with actual admin emails)
INSERT INTO public.admins (email) VALUES
  ('scott@brandedai.co.uk'),
  ('john@cbgroup.co')
ON CONFLICT (email) DO NOTHING;

-- Update the custom access token hook to check admins table
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_email text;
  is_admin boolean;
  matched_business_id uuid;
BEGIN
  -- Get the user's email
  user_email := event->'claims'->>'email';

  -- Check if user is in admins table
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE email = user_email
  ) INTO is_admin;

  -- If admin, set role and return
  IF is_admin THEN
    claims := event->'claims';
    claims := jsonb_set(claims, '{user_role}', '"admin"');
    claims := jsonb_set(claims, '{business_id}', 'null');
    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
  END IF;

  -- Check if user email matches a business contact_email
  SELECT id INTO matched_business_id
  FROM public.businesses
  WHERE contact_email = user_email
  LIMIT 1;

  -- If no match by email, check by auth_user_id
  IF matched_business_id IS NULL THEN
    SELECT id INTO matched_business_id
    FROM public.businesses
    WHERE auth_user_id = (event->'claims'->>'sub')::uuid
    LIMIT 1;
  END IF;

  -- Build the claims
  claims := event->'claims';

  IF matched_business_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', '"business_user"');
    claims := jsonb_set(claims, '{business_id}', to_jsonb(matched_business_id::text));
  ELSE
    -- Not admin and not business user = unauthorized (no role)
    claims := jsonb_set(claims, '{user_role}', 'null');
    claims := jsonb_set(claims, '{business_id}', 'null');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;
