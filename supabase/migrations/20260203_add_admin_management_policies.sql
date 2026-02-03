-- Add RLS policies for admin management
-- Only super_admin can insert, update, or delete admin records

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Super admins can insert admins" ON public.admins;
DROP POLICY IF EXISTS "Super admins can update admins" ON public.admins;
DROP POLICY IF EXISTS "Super admins can delete admins" ON public.admins;

-- Create INSERT policy for super_admin only
CREATE POLICY "Super admins can insert admins" ON public.admins
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = current_setting('request.jwt.claims', true)::jsonb->>'email'
      AND role = 'super_admin'
    )
  );

-- Create UPDATE policy for super_admin only
CREATE POLICY "Super admins can update admins" ON public.admins
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = current_setting('request.jwt.claims', true)::jsonb->>'email'
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = current_setting('request.jwt.claims', true)::jsonb->>'email'
      AND role = 'super_admin'
    )
  );

-- Create DELETE policy for super_admin only
CREATE POLICY "Super admins can delete admins" ON public.admins
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = current_setting('request.jwt.claims', true)::jsonb->>'email'
      AND role = 'super_admin'
    )
  );

-- Fix any NULL roles by setting to super_admin (shouldn't exist but safety)
UPDATE public.admins SET role = 'super_admin' WHERE role IS NULL;
