-- =============================================================================
-- Reminder Infrastructure: Database function for pending submissions
-- =============================================================================
-- Purpose: Enable automated reminder emails for businesses that haven't
-- submitted monthly data
-- Created: 2026-02-02
-- =============================================================================

-- Create function to find businesses with pending submissions for a given month
CREATE OR REPLACE FUNCTION get_pending_submissions(target_month text)
RETURNS TABLE (
  business_id uuid,
  business_name text,
  user_email text,
  month text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (b.id)
    b.id AS business_id,
    b.name AS business_name,
    u.email AS user_email,
    target_month AS month
  FROM businesses b
  JOIN profiles p ON p.business_id = b.id
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN data_requests dr ON dr.business_id = b.id
    AND dr.month = target_month
    AND dr.status = 'submitted'
  WHERE dr.id IS NULL  -- No submitted request for this month
    AND u.email IS NOT NULL
    AND p.role = 'business_user';  -- Only notify business users, not admins
END;
$$;

-- Grant execute permission to service_role (used by Edge Functions)
GRANT EXECUTE ON FUNCTION get_pending_submissions(text) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION get_pending_submissions(text) IS
'Returns list of businesses that have not submitted data for the specified month (YYYY-MM format). Used by send-reminders Edge Function.';

-- =============================================================================
-- MANUAL SETUP REQUIRED: pg_cron job for daily reminders
-- =============================================================================
-- Run these commands manually in Supabase SQL Editor after:
-- 1. Deploying send-reminders Edge Function
-- 2. Setting RESEND_API_KEY in Edge Function secrets
-- 3. Storing project URL and anon key in Supabase Vault
--
-- Step 1: Store secrets in Vault (run once)
-- SELECT vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
-- SELECT vault.create_secret('YOUR_SUPABASE_ANON_KEY', 'anon_key');
--
-- Step 2: Schedule the cron job (run once)
-- SELECT cron.schedule(
--   'send-reminder-emails',
--   '0 9 * * *',  -- 9:00 AM UTC daily
--   $$
--   SELECT net.http_post(
--     url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
--            || '/functions/v1/send-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
--     ),
--     body := jsonb_build_object('trigger', 'scheduled')
--   ) AS request_id;
--   $$
-- );
--
-- To verify job is scheduled:
-- SELECT * FROM cron.job;
--
-- To see job history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- To unschedule (if needed):
-- SELECT cron.unschedule('send-reminder-emails');
-- =============================================================================
