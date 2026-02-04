-- Allow business users to update their own submissions
-- Bug fix: Upsert was failing because business users could INSERT but not UPDATE
-- This prevented companies from updating their previously submitted data

CREATE POLICY "Business user can update own submissions" ON company_submissions
  FOR UPDATE USING (
    data_request_id IN (
      SELECT id FROM data_requests WHERE business_id = public.get_my_business_id()
    )
  );

-- Also allow anonymous users to update their submissions (for magic link flow)
-- Token validation happens in app before allowing access to form
CREATE POLICY "Anyone can update submissions" ON company_submissions
  FOR UPDATE USING (true);

-- Allow business users to update their own data_requests (to mark as submitted)
-- Bug fix: After submitting financial data, the status update was failing
-- because business users could only SELECT, not UPDATE their data_requests
CREATE POLICY "Business user can update own data_requests" ON data_requests
  FOR UPDATE USING (business_id = public.get_my_business_id());

-- Allow business users to insert their own data_requests
-- This enables the unified-submit flow where companies can submit data
-- even if no data_request was pre-created by an admin
CREATE POLICY "Business user can insert own data_requests" ON data_requests
  FOR INSERT WITH CHECK (business_id = public.get_my_business_id());
