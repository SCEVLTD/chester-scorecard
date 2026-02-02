# Phase 7: Reminders - Research

**Researched:** 2026-02-02
**Domain:** Email automation, scheduled jobs, submission tracking
**Confidence:** HIGH

## Summary

Phase 7 implements automated email reminders for monthly data submission. The project already has substantial infrastructure to leverage:
- **Edge Functions** pattern established (3 existing functions for AI analysis)
- **pg_cron** and **pg_net** extensions available on Supabase for scheduled job execution
- **data_requests** table already tracks submission status per business per month (`pending`, `submitted`, `used`)
- **profiles** table links users to businesses with email from auth.users

The reminder system needs:
1. A new database table for reminder configuration (frequency per business)
2. An Edge Function that sends emails via Resend API
3. A pg_cron job to invoke the Edge Function on schedule
4. Admin UI to view submission status and configure reminders

**Primary recommendation:** Use pg_cron to trigger an Edge Function daily at 9am UK time. The Edge Function queries businesses with pending submissions and sends reminder emails via Resend. Stop reminders when `data_requests.status = 'submitted'`.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Resend API | Latest | Email sending | Official Supabase recommendation, simple REST API, 100 free emails/day |
| pg_cron | 1.6.4+ | Scheduled jobs | Built into Supabase, no external scheduler needed |
| pg_net | Latest | HTTP from SQL | Enables pg_cron to invoke Edge Functions |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | ^2.91.1 | Database queries | Admin dashboard fetching submission status |
| @tanstack/react-query | ^5.90.20 | Server state | Reminder config mutations and queries |
| date-fns | ^4.1.0 | Date formatting | Display last reminder sent, due dates |
| sonner | ^2.0.7 | Toast notifications | Feedback when updating config |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Resend | SendGrid | SendGrid more complex setup, Resend is Supabase-recommended |
| Resend | Supabase Auth SMTP | Auth SMTP only for auth emails, not transactional |
| pg_cron | External cron (GitHub Actions) | External adds complexity, pg_cron is native |
| Daily cron | Per-business schedules | Daily simpler; per-business adds complexity for 19 businesses |

**Installation:**
```bash
# No npm packages needed - Edge Function uses Deno imports
# Supabase CLI for function deployment
npx supabase functions deploy send-reminders
```

## Architecture Patterns

### Recommended Project Structure
```
supabase/
└── functions/
    └── send-reminders/
        └── index.ts           # Edge Function for sending reminder emails

src/
├── hooks/
│   ├── use-reminder-config.ts     # CRUD for reminder settings
│   └── use-submission-status.ts   # Portfolio submission status query
├── components/
│   └── reminder-config-form.tsx   # Admin UI for reminder frequency
└── pages/
    └── portfolio.tsx              # Add submission status panel
```

### Pattern 1: Scheduled Edge Function via pg_cron
**What:** Use pg_cron to invoke an Edge Function on a schedule (e.g., daily at 9am)
**When to use:** Recurring background tasks that need to run without user interaction
**Example:**
```sql
-- Source: https://supabase.com/docs/guides/functions/schedule-functions
-- Store credentials in Vault
SELECT vault.create_secret('https://project-ref.supabase.co', 'project_url');
SELECT vault.create_secret('YOUR_SUPABASE_ANON_KEY', 'anon_key');

-- Schedule daily at 9am UK time (UTC+0/+1)
SELECT cron.schedule(
  'send-reminder-emails',
  '0 9 * * *',  -- 9:00 AM UTC daily
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := jsonb_build_object('trigger', 'scheduled')
  ) AS request_id;
  $$
);
```

### Pattern 2: Resend Email Sending from Edge Function
**What:** Call Resend REST API directly from Deno Edge Function
**When to use:** Sending transactional emails from serverless functions
**Example:**
```typescript
// Source: https://supabase.com/docs/guides/functions/examples/send-emails
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${RESEND_API_KEY}`,
  },
  body: JSON.stringify({
    from: 'Chester Business Group <noreply@velocitygrowth.co.uk>',
    to: recipientEmail,
    subject: `Monthly Data Submission Reminder - ${monthName}`,
    html: emailHtml,
  }),
})
```

### Pattern 3: Submission Status Tracking (Existing)
**What:** Use existing `data_requests.status` to determine who has/hasn't submitted
**When to use:** Query to find businesses needing reminders
**Example:**
```sql
-- Find businesses with no submission for current month
SELECT b.id, b.name, p.id as user_id, u.email
FROM businesses b
JOIN profiles p ON p.business_id = b.id
JOIN auth.users u ON u.id = p.id
LEFT JOIN data_requests dr ON dr.business_id = b.id
  AND dr.month = '2026-02'
  AND dr.status = 'submitted'
WHERE dr.id IS NULL  -- No submitted data_request for this month
```

### Anti-Patterns to Avoid
- **Don't store email credentials in code:** Use Supabase Secrets (`supabase secrets set RESEND_API_KEY=...`)
- **Don't send emails synchronously from client:** Use Edge Function for server-side sending
- **Don't create new tables if existing works:** `data_requests.status` already tracks submission state
- **Don't hardcode reminder schedules:** Make frequency configurable per-business or globally

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Job scheduling | Node-cron, setInterval | pg_cron via Supabase | Native Postgres, survives restarts, no external service |
| Email sending | SMTP library, raw API calls | Resend SDK/API | Handles deliverability, bounces, analytics |
| Submission tracking | New table for "submitted" flag | Existing `data_requests.status` | Already tracks `pending`/`submitted`/`used` |
| User emails | New contact table | `auth.users.email` via profiles join | Users already have emails from auth |
| Job monitoring | Custom logging | `cron.job_run_details` table | pg_cron auto-logs all job runs |

**Key insight:** The existing `data_requests` table with its `status` field is the foundation for reminder logic. A business has submitted when `status = 'submitted'`; send reminder when `status = 'pending'` or no data_request exists for the month.

## Common Pitfalls

### Pitfall 1: Timezone Confusion in Cron Schedule
**What goes wrong:** Emails sent at wrong time (3am instead of 9am UK)
**Why it happens:** pg_cron uses UTC; UK is UTC+0 (winter) or UTC+1 (summer)
**How to avoid:**
- Schedule for 9am UTC (safe for UK year-round)
- Or adjust cron expression seasonally
- Document the timezone assumption
**Warning signs:** User complaints about email timing

### Pitfall 2: Missing Email Configuration in Secrets
**What goes wrong:** Edge Function fails silently or returns 500
**Why it happens:** `RESEND_API_KEY` not set in Supabase Secrets
**How to avoid:**
- Check for undefined and return clear error
- Document required secrets in PLAN.md
- Verify in Supabase Dashboard > Edge Functions > Secrets
**Warning signs:** Empty error responses, 500 status codes

### Pitfall 3: Resend Domain Not Verified
**What goes wrong:** Emails fail to send with "domain not verified" error
**Why it happens:** Sending from domain not verified in Resend dashboard
**How to avoid:**
- Verify `velocitygrowth.co.uk` domain in Resend before deployment
- Use Resend's test domain (`onboarding@resend.dev`) for development
- Test with real domain before production
**Warning signs:** Resend API returns 422 with domain error

### Pitfall 4: Sending Duplicate Reminders
**What goes wrong:** User receives multiple reminder emails on same day
**Why it happens:** Edge Function called multiple times, no deduplication
**How to avoid:**
- Track last reminder sent date in database (new column or table)
- Check date before sending
- Use idempotency key if Resend supports it
**Warning signs:** User complaints about spam, multiple emails in logs

### Pitfall 5: RLS Blocking Admin Queries
**What goes wrong:** Edge Function can't query businesses/profiles
**Why it happens:** Edge Function runs as anon user, RLS blocks access
**How to avoid:**
- Use service role key for Edge Function (not anon key)
- Or create specific RLS policy for the Edge Function
- Alternatively, use database function with SECURITY DEFINER
**Warning signs:** Empty results, permission errors

### Pitfall 6: No Stop Condition for Reminders
**What goes wrong:** User still gets reminders after submitting
**Why it happens:** Query doesn't check `data_requests.status = 'submitted'`
**How to avoid:**
- Query specifically excludes businesses with submitted status
- Test by submitting then verifying no reminder
**Warning signs:** Angry emails from users who already submitted

## Code Examples

Verified patterns from official sources:

### Edge Function for Sending Reminders
```typescript
// Source: https://supabase.com/docs/guides/functions/examples/send-emails
// supabase/functions/send-reminders/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PendingBusiness {
  business_id: string
  business_name: string
  user_email: string
  month: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured')
    }

    // Use service role to bypass RLS
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Get current month in YYYY-MM format
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Find businesses that haven't submitted for current month
    const { data: pendingBusinesses, error } = await supabase.rpc(
      'get_pending_submissions',
      { target_month: currentMonth }
    )

    if (error) throw error

    const emailResults = []
    for (const biz of (pendingBusinesses || []) as PendingBusiness[]) {
      const result = await sendReminderEmail(biz)
      emailResults.push({ business: biz.business_name, ...result })
    }

    return new Response(JSON.stringify({ sent: emailResults.length, results: emailResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error sending reminders:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function sendReminderEmail(biz: PendingBusiness) {
  const submissionUrl = `https://your-app.vercel.app/company/${biz.business_id}/submit`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Chester Business Group <noreply@velocitygrowth.co.uk>',
      to: biz.user_email,
      subject: `Monthly Data Submission Reminder - ${biz.month}`,
      html: `
        <h2>Monthly Data Submission Reminder</h2>
        <p>Hi,</p>
        <p>This is a friendly reminder to submit your monthly business data for ${biz.business_name}.</p>
        <p><a href="${submissionUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Submit Data Now</a></p>
        <p>Thank you,<br>Chester Brethren Business Group</p>
      `,
    }),
  })

  return { status: response.status, ok: response.ok }
}
```

### Database Function for Pending Submissions
```sql
-- Source: Pattern derived from existing data_requests usage
CREATE OR REPLACE FUNCTION get_pending_submissions(target_month text)
RETURNS TABLE (
  business_id uuid,
  business_name text,
  user_email text,
  month text
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (b.id)
    b.id as business_id,
    b.name as business_name,
    u.email as user_email,
    target_month as month
  FROM businesses b
  JOIN profiles p ON p.business_id = b.id
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN data_requests dr
    ON dr.business_id = b.id
    AND dr.month = target_month
    AND dr.status = 'submitted'
  WHERE dr.id IS NULL;  -- No submitted request for this month
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Submission Status Dashboard Query
```typescript
// Source: Pattern from existing use-portfolio-summary.ts
export function useSubmissionStatus(month: string) {
  return useQuery({
    queryKey: ['submission-status', month],
    queryFn: async () => {
      // Get all businesses
      const { data: businesses, error: bizError } = await supabase
        .from('businesses')
        .select('id, name')

      if (bizError) throw bizError

      // Get submitted data_requests for the month
      const { data: submitted, error: subError } = await supabase
        .from('data_requests')
        .select('business_id')
        .eq('month', month)
        .eq('status', 'submitted')

      if (subError) throw subError

      const submittedIds = new Set(submitted.map(s => s.business_id))

      return businesses.map(b => ({
        id: b.id,
        name: b.name,
        submitted: submittedIds.has(b.id),
      }))
    },
  })
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| External cron services | pg_cron native to Supabase | 2024 | No external dependencies |
| SMTP libraries | REST-based email APIs (Resend) | 2023 | Simpler integration, better deliverability |
| Custom scheduling tables | pg_cron + pg_net combo | 2024 | Built-in job run logging |

**Current best practice:**
- pg_cron 1.6.4 with sub-minute scheduling support
- Resend as official Supabase email recommendation
- Supabase Vault for secrets storage
- Edge Functions for email business logic

## Open Questions

Things that couldn't be fully resolved:

1. **Email domain verification**
   - What we know: `velocitygrowth.co.uk` needs to be verified in Resend
   - What's unclear: Who has DNS access to add verification records?
   - Recommendation: Use Resend test domain for development; verify production domain before launch

2. **Reminder frequency granularity**
   - What we know: Requirement says "configurable frequency (daily, every 2 days, etc.)"
   - What's unclear: Per-business or global setting? How fine-grained?
   - Recommendation: Start with global daily; add per-business config later if needed

3. **Email template branding**
   - What we know: Should use Chester/Velocity branding
   - What's unclear: Exact HTML template design, logo in email
   - Recommendation: Simple HTML template initially; enhance with React Email if needed

4. **Multiple contacts per business**
   - What we know: Currently one profile per business
   - What's unclear: Do some businesses have multiple contacts?
   - Recommendation: Use existing profile emails; add contact list feature if requested

## Sources

### Primary (HIGH confidence)
- [Supabase Edge Functions - Schedule Functions](https://supabase.com/docs/guides/functions/schedule-functions) - Verified pg_cron + pg_net pattern
- [Supabase Edge Functions - Send Emails](https://supabase.com/docs/guides/functions/examples/send-emails) - Verified Resend integration
- [Supabase Cron Quickstart](https://supabase.com/docs/guides/cron/quickstart) - SQL examples for scheduling
- Existing codebase: `supabase/functions/generate-meeting-summary/index.ts` - Edge Function pattern

### Secondary (MEDIUM confidence)
- [Resend Supabase Documentation](https://resend.com/docs/send-with-supabase-edge-functions) - Official Resend guide
- [Supabase pg_cron Extension](https://supabase.com/docs/guides/database/extensions/pg_cron) - Extension details

### Tertiary (LOW confidence)
- React Email templates - Not yet verified in this codebase context

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Supabase official documentation confirms pg_cron + Resend pattern
- Architecture: HIGH - Derived from existing Edge Function patterns in codebase
- Pitfalls: MEDIUM - Based on common patterns, some require production validation
- Email templates: LOW - Specific design not defined

**Research date:** 2026-02-02
**Valid until:** 2026-02-15 (short project timeline, stable patterns)

## Implementation Recommendations

Based on research, Phase 7 should be structured as:

### Plan 07-01: Reminder Infrastructure
- Database: Create reminder_config table (optional) or use global config
- Database function: `get_pending_submissions(month)` for efficient queries
- Edge Function: `send-reminders` with Resend integration
- pg_cron job: Daily trigger at 9am UTC

### Plan 07-02: Admin Dashboard & Configuration
- Submission status panel on portfolio page (who submitted/pending)
- Reminder configuration UI (if per-business config needed)
- Manual "send reminders now" button for admin testing

Key files to create/modify:
- `supabase/functions/send-reminders/index.ts` - New Edge Function
- `supabase/migrations/20260202_add_reminder_functions.sql` - Database function + cron job
- `src/hooks/use-submission-status.ts` - Query for dashboard
- `src/pages/portfolio.tsx` - Add submission status panel

Required Supabase setup:
1. Verify domain in Resend dashboard
2. Set `RESEND_API_KEY` in Edge Function secrets
3. Store project URL and anon key in Supabase Vault
4. Enable pg_cron and pg_net extensions if not already enabled
