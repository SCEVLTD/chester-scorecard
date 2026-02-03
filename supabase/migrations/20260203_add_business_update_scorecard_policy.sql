-- Allow business users to update their own scorecards
-- Required for saving AI analysis after generation
CREATE POLICY "Business user can update own scorecards"
ON scorecards FOR UPDATE
USING (business_id = get_my_business_id());
