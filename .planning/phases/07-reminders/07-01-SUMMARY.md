---
phase: 07-reminders
plan: 01
subsystem: notifications
status: complete
tags: [edge-function, email, resend, pg-cron, automation]

requires:
  - 02-01 # Database auth schema (profiles, auth.users access)
  - 03-01 # Data requests table structure

provides:
  - send-reminders Edge Function
  - get_pending_submissions database function
  - pg_cron setup instructions for daily automation

affects:
  - 07-02 # Future reminder UI (if added)

tech-stack:
  added:
    - Resend API for email delivery
  patterns:
    - Edge Function with Resend integration
    - SECURITY DEFINER for cross-schema queries
    - pg_cron for scheduled tasks

key-files:
  created:
    - supabase/functions/send-reminders/index.ts
    - supabase/migrations/20260202_add_reminder_infrastructure.sql
  modified: []

decisions:
  - id: remind-01
    title: Resend for email delivery
    choice: Use Resend API instead of building SMTP
    rationale: Developer-friendly API, reliable delivery, domain verification built-in
    alternatives: [SendGrid, AWS SES, nodemailer]

  - id: remind-02
    title: Daily 9am UTC reminders
    choice: Single daily reminder at 9am UTC
    rationale: Aligns with business hours, not too aggressive
    alternatives: [Multiple reminders, different times per timezone]

  - id: remind-03
    title: Manual pg_cron setup
    choice: Document cron setup but don't auto-execute in migration
    rationale: Requires Vault secrets to be configured first
    alternatives: [Auto-execute with env check, separate script]

  - id: remind-04
    title: Current month only
    choice: Only remind for current month, not past months
    rationale: Keep reminders focused on recent data
    alternatives: [Remind for all missing months, configurable lookback]

metrics:
  duration: 3 minutes
  completed: 2026-02-02
---

# Phase 7 Plan 01: Reminder Email Infrastructure Summary

**One-liner:** Automated reminder emails via Resend API for businesses with pending monthly submissions

## What Was Built

Created the foundation for automated email reminders to businesses that haven't submitted their monthly data:

**Edge Function (send-reminders):**
- Queries database for businesses missing submissions for current month
- Sends personalized reminder emails via Resend API
- Returns results with success/failure counts
- Follows established pattern from generate-meeting-summary

**Database Function (get_pending_submissions):**
- Uses SECURITY DEFINER to query across public and auth schemas
- Joins businesses, profiles, and auth.users to get email addresses
- LEFT JOIN data_requests to identify missing submissions
- Filters for business_user role only (excludes admins)

**Automation Setup:**
- Documented pg_cron configuration for daily 9am UTC reminders
- Instructions for Vault secret storage (project URL, anon key)
- Verification queries for monitoring cron job execution

**Email Content:**
- Professional HTML template with Chester branding
- Clear CTA button linking to submission page
- Includes month and business-specific submission URL

## Technical Implementation

### Edge Function Pattern

```typescript
// Environment checks
const resendApiKey = Deno.env.get('RESEND_API_KEY')
if (!resendApiKey) throw new Error('...')

// Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

// Query pending submissions
const { data } = await supabase.rpc('get_pending_submissions', { target_month })

// Send emails via Resend
for (const submission of data) {
  await sendReminderEmail(resendApiKey, submission)
}
```

### Database Function

```sql
CREATE OR REPLACE FUNCTION get_pending_submissions(target_month text)
RETURNS TABLE (business_id uuid, business_name text, user_email text, month text)
SECURITY DEFINER  -- Allows querying auth.users from Edge Function
AS $$
  SELECT DISTINCT ON (b.id) ...
  FROM businesses b
  JOIN profiles p ON p.business_id = b.id
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN data_requests dr ON dr.business_id = b.id
    AND dr.month = target_month
    AND dr.status = 'submitted'
  WHERE dr.id IS NULL  -- No submission found
$$;
```

### Key Links Verified

| From | To | Via | Pattern |
|------|----|----|---------|
| pg_cron job | send-reminders Edge Function | pg_net HTTP POST | `net.http_post` |
| Edge Function | Resend API | fetch | `api.resend.com/emails` |
| get_pending_submissions | data_requests table | LEFT JOIN | Check status='submitted' |

## Decisions Made

### Use Resend for Email Delivery

**Context:** Need reliable email delivery for reminder notifications

**Decision:** Use Resend API instead of building SMTP integration

**Rationale:**
- Clean developer API (simple POST to /emails endpoint)
- Domain verification built into dashboard
- Deliverability optimized (better than DIY SMTP)
- Generous free tier (3000 emails/month)

**Impact:** Requires RESEND_API_KEY environment variable and domain verification in Resend dashboard

### Daily 9am UTC Reminders

**Context:** When should automated reminders be sent?

**Decision:** Single daily reminder at 9am UTC (9am UK time in winter, 10am in summer)

**Rationale:**
- Aligns with business hours for UK-based Chester group
- Early enough to action same day
- Not too aggressive (once daily maximum)

**Alternative considered:** Multiple reminders throughout day (rejected as too aggressive)

### Manual pg_cron Setup

**Context:** pg_cron requires Vault secrets (project URL, anon key)

**Decision:** Document cron setup in migration comments but don't auto-execute

**Rationale:**
- Secrets must be stored in Vault first (manual step via Supabase dashboard)
- Running vault.create_secret in migration would fail without proper permissions
- Clear documentation allows admin to execute when ready
- Safer than auto-execution with potential for silent failure

**Alternative considered:** Separate setup script (rejected - keeping all SQL together is clearer)

### Current Month Only

**Context:** Should reminders cover past missing months or just current?

**Decision:** Only remind for current month (YYYY-MM format)

**Rationale:**
- Keeps reminders focused on recent data
- Past months may be legitimately skipped (business closed, holiday)
- Reduces email volume

**Alternative considered:** Remind for all missing months (rejected - could overwhelm users with backlog)

## Testing & Verification

### Build Verification
- TypeScript compilation: PASSED
- Migration SQL syntax: PASSED
- Edge Function pattern: PASSED (corsHeaders, Deno.serve, error handling)

### Code Review
- SECURITY DEFINER grants: PASSED (service_role has EXECUTE permission)
- RESEND_API_KEY check: PASSED (throws error if missing)
- fetch to api.resend.com: PASSED (correct endpoint)
- get_pending_submissions function: PASSED (correct JOIN logic)

### Manual Testing Required (Post-Deployment)

1. **Deploy Edge Function:**
   ```bash
   npx supabase functions deploy send-reminders
   ```

2. **Set Resend API Key:**
   - Get key from Resend Dashboard → API Keys
   - Set via Supabase Dashboard → Edge Functions → send-reminders → Settings → Secrets
   - Add: `RESEND_API_KEY=re_xxx`

3. **Test Manual Trigger:**
   ```bash
   curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-reminders \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json"
   ```

4. **Verify Email Sent:**
   - Check Resend Dashboard → Logs for delivery status
   - Check recipient inbox for reminder email

5. **Setup pg_cron (Optional - for automation):**
   - Follow instructions in migration file lines 54-82
   - Store Vault secrets via Supabase SQL Editor
   - Schedule cron job
   - Verify with `SELECT * FROM cron.job;`

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Phase 7 Status:**
- Plan 01: COMPLETE ✓
- Plan 02: N/A (no second plan in phase)

**Phase 7 Complete:** Reminder infrastructure ready for deployment

**Blockers for Production Use:**
1. Resend domain verification (velocitygrowth.co.uk must be verified)
2. RESEND_API_KEY must be set in Edge Function secrets
3. pg_cron requires manual Vault setup (optional - can trigger manually)

**No technical blockers** - All code complete and ready to deploy

## Production Deployment Checklist

- [ ] Verify velocitygrowth.co.uk domain in Resend Dashboard
- [ ] Deploy Edge Function: `npx supabase functions deploy send-reminders`
- [ ] Set RESEND_API_KEY in Supabase Dashboard
- [ ] Apply migration: `supabase db push`
- [ ] Test manual trigger (see Testing section above)
- [ ] Verify email delivery in Resend Dashboard
- [ ] (Optional) Setup pg_cron for daily automation
- [ ] (Optional) Monitor cron.job_run_details for failures

## Files Changed

| File | Type | Changes | Lines |
|------|------|---------|-------|
| supabase/functions/send-reminders/index.ts | created | Edge Function with Resend integration | 180 |
| supabase/migrations/20260202_add_reminder_infrastructure.sql | created | Database function + cron instructions | 83 |

**Total:** 2 files created, 263 lines added

## Commit History

| Commit | Message | Files |
|--------|---------|-------|
| be4d7c4 | feat(07-01): create send-reminders Edge Function and database function | send-reminders/index.ts, 20260202_add_reminder_infrastructure.sql |

## Knowledge for Future Sessions

### How Reminders Work

1. **Trigger:** pg_cron calls Edge Function daily at 9am UTC (or manual API call)
2. **Query:** Edge Function calls get_pending_submissions(current_month)
3. **Filter:** Function returns businesses with no 'submitted' data_request for month
4. **Send:** For each business, POST to Resend API with personalized email
5. **Result:** Function returns count of sent emails and individual results

### Email Template Pattern

- Simple HTML with inline styles (for email client compatibility)
- CTA button links to `/company/{business_id}/submit`
- From address: `Chester Business Group <noreply@velocitygrowth.co.uk>`
- Subject: `Monthly Data Submission Reminder - YYYY-MM`

### Debugging Failed Reminders

```sql
-- Check which businesses should be reminded
SELECT * FROM get_pending_submissions('2026-02');

-- Check cron job history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Check Edge Function logs
-- (via Supabase Dashboard → Edge Functions → send-reminders → Logs)
```

### Extending Reminder Logic

To add reminder for specific past months (not just current):

```typescript
// Change in Edge Function
const targetMonth = '2026-01'  // Instead of auto-calculated current month
```

To change frequency:

```sql
-- Change in cron.schedule
'0 9 * * *'  -- Daily at 9am
'0 9 * * 1'  -- Weekly on Monday at 9am
'0 9 1 * *'  -- Monthly on 1st at 9am
```

---

**Phase 7 Plan 01 Complete** ✓

Ready for deployment and testing with real Resend credentials.
