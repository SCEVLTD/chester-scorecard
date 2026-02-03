-- Company emails table for multiple login addresses per business
CREATE TABLE IF NOT EXISTS public.company_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, email)
);

-- Enable RLS
ALTER TABLE public.company_emails ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admin can view all company_emails" ON company_emails
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin can insert company_emails" ON company_emails
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update company_emails" ON company_emails
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admin can delete company_emails" ON company_emails
  FOR DELETE USING (public.is_admin());

CREATE POLICY "Business user can view own company_emails" ON company_emails
  FOR SELECT USING (business_id = public.get_my_business_id());

-- Migrate existing contact_email to company_emails (as primary)
INSERT INTO public.company_emails (business_id, email, is_primary)
SELECT id, contact_email, true
FROM public.businesses
WHERE contact_email IS NOT NULL AND contact_email != ''
ON CONFLICT (business_id, email) DO NOTHING;

-- Update custom_access_token_hook to check company_emails table
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

  -- Check company_emails table first (new multi-email support)
  SELECT business_id INTO matched_business_id
  FROM public.company_emails
  WHERE email = user_email
  LIMIT 1;

  -- Fallback: check businesses.contact_email for backwards compatibility
  IF matched_business_id IS NULL THEN
    SELECT id INTO matched_business_id
    FROM public.businesses
    WHERE contact_email = user_email
    LIMIT 1;
  END IF;

  -- Final fallback: check by auth_user_id
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
    claims := jsonb_set(claims, '{user_role}', 'null');
    claims := jsonb_set(claims, '{business_id}', 'null');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;
