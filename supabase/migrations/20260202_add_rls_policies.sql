-- Chester Business Scorecard - RLS Policies
-- Migration: 20260202_add_rls_policies
-- Purpose: Replace permissive "USING (true)" policies with role-based access control
--
-- IMPORTANT: Uses public schema helper functions (not auth schema):
--   - public.is_admin() - returns true if current user has admin role
--   - public.get_my_business_id() - returns business_id from JWT claims

-- ============================================
-- BUSINESSES: Admins see all, business users see only their own
-- ============================================
DROP POLICY IF EXISTS "Allow all access to businesses" ON businesses;

CREATE POLICY "Admin can view all businesses" ON businesses
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Business user can view own business" ON businesses
  FOR SELECT USING (id = public.get_my_business_id());

CREATE POLICY "Admin can insert businesses" ON businesses
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update businesses" ON businesses
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admin can delete businesses" ON businesses
  FOR DELETE USING (public.is_admin());

-- ============================================
-- SCORECARDS: Admins see all, business users see only their business
-- ============================================
DROP POLICY IF EXISTS "Allow all access to scorecards" ON scorecards;

CREATE POLICY "Admin can view all scorecards" ON scorecards
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Business user can view own scorecards" ON scorecards
  FOR SELECT USING (business_id = public.get_my_business_id());

CREATE POLICY "Admin can insert scorecards" ON scorecards
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update scorecards" ON scorecards
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admin can delete scorecards" ON scorecards
  FOR DELETE USING (public.is_admin());

CREATE POLICY "Business user can insert own scorecards" ON scorecards
  FOR INSERT WITH CHECK (business_id = public.get_my_business_id());

-- ============================================
-- DATA_REQUESTS: Admins manage all, business users see their own
-- ============================================
DROP POLICY IF EXISTS "Allow all access to data_requests" ON data_requests;

CREATE POLICY "Admin can view all data_requests" ON data_requests
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin can insert data_requests" ON data_requests
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update data_requests" ON data_requests
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admin can delete data_requests" ON data_requests
  FOR DELETE USING (public.is_admin());

CREATE POLICY "Business user can view own data_requests" ON data_requests
  FOR SELECT USING (business_id = public.get_my_business_id());

-- ============================================
-- COMPANY_SUBMISSIONS: Magic link flow + admin access
-- Token validation happens in app, RLS allows anon insert
-- ============================================
DROP POLICY IF EXISTS "Allow all access to company_submissions" ON company_submissions;

-- Anyone can insert submissions (token validated in app before allowing access to form)
CREATE POLICY "Anyone can insert submissions" ON company_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can view all submissions" ON company_submissions
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin can update submissions" ON company_submissions
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admin can delete submissions" ON company_submissions
  FOR DELETE USING (public.is_admin());

CREATE POLICY "Business user can view own submissions" ON company_submissions
  FOR SELECT USING (
    data_request_id IN (
      SELECT id FROM data_requests WHERE business_id = public.get_my_business_id()
    )
  );

-- ============================================
-- SECTORS: Public read, admin write
-- ============================================
DROP POLICY IF EXISTS "Allow all access to sectors" ON sectors;

CREATE POLICY "Anyone can view sectors" ON sectors
  FOR SELECT USING (true);

CREATE POLICY "Admin can insert sectors" ON sectors
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update sectors" ON sectors
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admin can delete sectors" ON sectors
  FOR DELETE USING (public.is_admin());
