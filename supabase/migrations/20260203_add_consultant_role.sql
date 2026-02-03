-- Add role column to admins table to distinguish super_admin from consultant
-- Super admins (Shane): See all data including financials
-- Consultants (Dylan, Nick): See qualitative data, scores, AI summaries but NOT financials

-- Add role column with CHECK constraint
ALTER TABLE public.admins
ADD COLUMN role text NOT NULL DEFAULT 'super_admin'
CHECK (role IN ('super_admin', 'consultant'));

-- Existing admins default to super_admin (already set by DEFAULT clause)
-- No update needed, but document intent: scott@brandedai.co.uk and john@cbgroup.co are super_admin

-- Add consultant users Dylan and Nick
INSERT INTO public.admins (email, role) VALUES
  ('dylan@velocitygrowth.co.uk', 'consultant'),
  ('nick@velocitygrowth.co.uk', 'consultant')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

-- Update custom access token hook to return role from admins table
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_email text;
  admin_record record;
  matched_business_id uuid;
BEGIN
  -- Get the user's email
  user_email := event->'claims'->>'email';

  -- Check if user is in admins table and get their role
  SELECT email, role INTO admin_record
  FROM public.admins
  WHERE email = user_email;

  -- If admin found, set role from their record
  IF FOUND THEN
    claims := event->'claims';
    -- Return the actual role ('super_admin' or 'consultant') instead of generic 'admin'
    claims := jsonb_set(claims, '{user_role}', to_jsonb(admin_record.role));
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
