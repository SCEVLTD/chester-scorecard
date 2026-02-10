# Chester Business Scorecard - Tasks

> Last updated: 2026-02-10
> Status: **SECURITY & ENTERPRISE HARDENING IN PROGRESS**
> Audit: See `SECURITY_AUDIT_2026-02-10.md` for full findings

## Current Priority: Security & Enterprise SaaS Readiness

Following a comprehensive security audit on 2026-02-10, these phases take immediate priority over all feature work. The application has critical security vulnerabilities that must be fixed before further deployment.

**Severity Legend:** CRITICAL = exploitable now, HIGH = significant risk, MEDIUM = should fix, LOW = best practice

---

## Phase 16: Critical Security Fixes (IMMEDIATE - Do First)

> **Priority:** CRITICAL
> **Estimated effort:** 4-5 hours
> **Dependencies:** None - start immediately

### Task 16.1: Add JWT Authentication to generate-analysis Edge Function
- **Status:** ✅ COMPLETE
- **Severity:** CRITICAL
- **File:** `supabase/functions/generate-analysis/index.ts`
- **Problem:** Zero authentication. Anyone with the Supabase URL can call this function and burn Anthropic API credits. No auth header check, no JWT verification, no role check.
- **Changes required:**
  - [ ] Extract and verify JWT from Authorization header via `supabase.auth.getUser(token)`
  - [ ] Return 401 if no valid token
  - [ ] Verify caller has admin or consultant role (not business_user)
  - [ ] Log the caller's user ID for audit purposes

### Task 16.2: Add JWT Authentication to generate-portfolio-analysis Edge Function
- **Status:** ✅ COMPLETE
- **Severity:** CRITICAL
- **Depends on:** 16.1 (use same auth pattern)
- **File:** `supabase/functions/generate-portfolio-analysis/index.ts`
- **Problem:** Zero authentication. Same issue as 16.1.
- **Changes required:**
  - [ ] Add same auth verification pattern as 16.1
  - [ ] Verify caller has admin or consultant role

### Task 16.3: Fix Authentication in generate-meeting-summary Edge Function
- **Status:** ✅ COMPLETE
- **Severity:** CRITICAL
- **Depends on:** 16.1 (use same auth pattern)
- **File:** `supabase/functions/generate-meeting-summary/index.ts`
- **Problem:** Auth check is OPTIONAL (line 258: `if (authHeader)` - still processes without auth).
- **Changes required:**
  - [ ] Make auth header MANDATORY (return 401 if missing)
  - [ ] Verify JWT via `supabase.auth.getUser(token)`
  - [ ] Verify caller has admin or consultant role

### Task 16.4: Replace Wildcard CORS on All Edge Functions
- **Status:** ✅ COMPLETE
- **Severity:** HIGH
- **Files:** ALL files in `supabase/functions/*/index.ts` (12 functions)
- **Problem:** Every Edge Function uses `'Access-Control-Allow-Origin': '*'` allowing any website to make cross-origin requests.
- **Changes required:**
  - [ ] Create shared CORS config: `const ALLOWED_ORIGINS = [Deno.env.get('SITE_URL') || 'https://chester.benchiva.com', 'http://localhost:5173']`
  - [ ] Replace `'*'` with origin check in all 12 functions:
    - `generate-analysis`
    - `generate-portfolio-analysis`
    - `generate-meeting-summary`
    - `send-company-invite`
    - `send-admin-invite`
    - `send-invitations`
    - `send-reminders`
    - `send-email`
    - `create-company-account`
    - `complete-account-setup`
    - `complete-admin-setup`
    - `update-meeting`
  - [ ] Validate `Origin` header against allowed list
  - [ ] Return 403 for unknown origins

### Task 16.5: Add Security Headers to Vercel Configuration
- **Status:** ✅ COMPLETE
- **Severity:** HIGH
- **File:** `vercel.json`
- **Problem:** No security headers configured. Vulnerable to clickjacking, MIME-type attacks, no HSTS.
- **Changes required:**
  - [ ] Add `Content-Security-Policy` header
  - [ ] Add `X-Content-Type-Options: nosniff`
  - [ ] Add `X-Frame-Options: DENY`
  - [ ] Add `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - [ ] Add `Referrer-Policy: strict-origin-when-cross-origin`
  - [ ] Add `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Task 16.6: Remove Sensitive Console Logging from Production
- **Status:** ✅ COMPLETE
- **Severity:** MEDIUM
- **Files:** `src/contexts/auth-context.tsx` (primary), 35 files total with 61 occurrences
- **Problem:** JWT claims (user_role, business_id) logged to browser console on every page load. 61 console.* statements across codebase.
- **Changes required:**
  - [ ] Remove `console.log('[Auth] JWT decoded claims:...')` from `auth-context.tsx:53`
  - [ ] Remove `console.log('[Auth] No access token')` from `auth-context.tsx:48`
  - [ ] Add Vite terser config to strip ALL console.* from production builds:
    ```
    build: { minify: 'terser', terserOptions: { compress: { drop_console: true } } }
    ```
  - [ ] Update `vite.config.ts`

### Task 16.7: Disable Source Maps and Remove DevTools from Production
- **Status:** ✅ COMPLETE
- **Severity:** MEDIUM
- **Files:** `vite.config.ts`, `src/App.tsx`
- **Problem:** Source maps expose full source code. ReactQueryDevtools available in production allows inspecting all cached queries including financial data.
- **Changes required:**
  - [ ] Add `build: { sourcemap: false }` to `vite.config.ts`
  - [ ] Conditionally render ReactQueryDevtools only in development:
    ```tsx
    {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    ```

---

## Phase 17: Database Security Hardening

> **Priority:** CRITICAL/HIGH
> **Estimated effort:** 1-2 days
> **Dependencies:** None - can run parallel with Phase 16

### Task 17.1: Fix Consultant Financial Data Leakage at Database Level
- **Status:** ✅ COMPLETE (migration created, needs applying)
- **Severity:** CRITICAL
- **Files:** New migration + RLS policy changes
- **Problem:** Consultant users can query ALL financial data directly via Supabase JS client in browser console. The UI "hiding" is purely cosmetic. `is_admin()` returns true for consultants, giving them full SELECT access to `company_submissions` which contains revenue, EBITDA, gross profit, wages.
- **Changes required:**
  - [ ] Create a `consultant_company_submissions` database VIEW that excludes financial columns:
    ```sql
    CREATE VIEW consultant_company_submissions AS
    SELECT id, data_request_id, submitted_at, submitted_by_name, submitted_by_email,
           company_biggest_opportunity, company_biggest_risk, company_challenges, company_wins,
           outbound_calls, first_orders
    FROM company_submissions;
    ```
  - [ ] OR: Replace the single `is_admin()` approach with separate policies:
    - `super_admin` gets full SELECT on company_submissions
    - `consultant` gets SELECT only on non-financial columns via the view
  - [ ] Update frontend hooks to use the view for consultant queries
  - [ ] Verify: Log in as consultant, open DevTools console, attempt `supabase.from('company_submissions').select('revenue_actual')` - should return no data or error

### Task 17.2: Convert SECURITY DEFINER Views to SECURITY INVOKER
- **Status:** ✅ COMPLETE (migration created, needs applying)
- **Severity:** HIGH
- **File:** New migration
- **Problem:** `city_monthly_aggregate`, `city_ytd_aggregate`, `eprofile_monthly_aggregate` views use SECURITY DEFINER (Supabase default), bypassing RLS. ANY authenticated user (including business_user) can query city-wide aggregate financial data.
- **Changes required:**
  - [ ] Recreate all three views with explicit `SECURITY INVOKER`:
    ```sql
    CREATE OR REPLACE VIEW public.city_monthly_aggregate
    WITH (security_invoker = true) AS ...
    ```
  - [ ] Test that business_users can no longer query aggregate financials
  - [ ] Test that admins/consultants can still access the views
  - [ ] Consider: Should consultants see aggregate financial totals? If not, add role filtering.

### Task 17.3: Set Explicit search_path on All Database Functions
- **Status:** ✅ COMPLETE (migration created, needs applying)
- **Severity:** MEDIUM
- **File:** New migration
- **Problem:** `is_admin()`, `get_my_business_id()`, `handle_new_user()`, `custom_access_token_hook()`, `calculate_e_profile()` all lack explicit `search_path`, making them vulnerable to search_path manipulation.
- **Changes required:**
  - [ ] Add `SET search_path = public` to every function:
    ```sql
    CREATE OR REPLACE FUNCTION public.is_admin()
    RETURNS BOOLEAN AS $$
      SELECT COALESCE(
        current_setting('request.jwt.claims', true)::jsonb->>'user_role' IN ('admin', 'super_admin', 'consultant'),
        false
      )
    $$ LANGUAGE sql STABLE SET search_path = public;
    ```
  - [ ] Apply same fix to: `get_my_business_id()`, `handle_new_user()`, `custom_access_token_hook()`, `calculate_e_profile()`

### Task 17.4: Strengthen Password Policy
- **Status:** ✅ COMPLETE (code updated, enable HaveIBeenPwned in Supabase Dashboard manually)
- **Severity:** MEDIUM
- **Depends on:** None
- **Files:** `supabase/functions/create-company-account/index.ts`, Supabase Dashboard
- **Problem:** Minimum password length is 6 characters. No complexity requirements. Leaked password protection disabled.
- **Changes required:**
  - [ ] Increase minimum password length to 12 characters in `create-company-account` Edge Function
  - [ ] Add basic complexity check (must contain letter + number)
  - [ ] Enable HaveIBeenPwned leaked password protection in Supabase Dashboard > Auth > Settings
  - [ ] Update any client-side password validation to match

### Task 17.5: Sanitise Error Messages in Edge Functions
- **Status:** ✅ COMPLETE
- **Severity:** MEDIUM
- **Files:** All Edge Functions that return `error.message` or `error.details`
- **Problem:** Error responses include raw error messages from Supabase/Anthropic SDKs which can leak internal details (schema names, API config, stack traces).
- **Changes required:**
  - [ ] Replace `details: error instanceof Error ? error.message : 'Unknown error'` with generic messages
  - [ ] Keep detailed error logging server-side via `console.error` (Supabase logs)
  - [ ] Return only: `{ error: 'Failed to [action]' }` to clients
  - [ ] Apply to all 12 Edge Functions

---

## Phase 18: Rate Limiting & Abuse Prevention

> **Priority:** HIGH
> **Estimated effort:** 1-2 days
> **Dependencies:** Phase 16 (auth must be in place first)

### Task 18.1: Implement Rate Limiting for AI Generation Functions
- **Status:** pending
- **Severity:** HIGH
- **Depends on:** 16.1, 16.2, 16.3
- **Files:** `supabase/functions/generate-analysis/index.ts`, `generate-portfolio-analysis/index.ts`, `generate-meeting-summary/index.ts`
- **Problem:** No rate limiting. Even after auth is added, a compromised account could generate unlimited AI requests burning API credits.
- **Changes required:**
  - [ ] Implement token-bucket or sliding-window rate limiting using Supabase database as store:
    ```sql
    CREATE TABLE rate_limits (
      user_id uuid REFERENCES auth.users(id),
      action text NOT NULL,
      window_start timestamptz NOT NULL,
      count integer DEFAULT 1,
      PRIMARY KEY (user_id, action, window_start)
    );
    ```
  - [ ] Limits: 10 AI generations per user per hour, 50 per day
  - [ ] Return 429 Too Many Requests when exceeded
  - [ ] Apply to all three AI functions

### Task 18.2: Implement Rate Limiting for Invitation/Email Functions
- **Status:** pending
- **Severity:** MEDIUM
- **Depends on:** 18.1 (use same rate limit infrastructure)
- **Files:** `send-company-invite`, `send-admin-invite`, `send-reminders`, `send-email`
- **Problem:** No rate limiting on email-sending functions. Could be abused for spam.
- **Changes required:**
  - [ ] Limits: 20 invitations per admin per day, 50 reminders per day
  - [ ] Apply to all email-related Edge Functions

### Task 18.3: Implement Rate Limiting for Account Creation
- **Status:** pending
- **Severity:** MEDIUM
- **Depends on:** 18.1
- **File:** `supabase/functions/create-company-account/index.ts`
- **Problem:** No rate limiting on account creation. Could be used for brute-force.
- **Changes required:**
  - [ ] Limits: 10 account creations per admin per hour
  - [ ] Add exponential backoff on failed auth attempts (Supabase may handle this)

---

## Phase 19: Enterprise Observability

> **Priority:** HIGH
> **Estimated effort:** 2-3 days
> **Dependencies:** None - can start immediately

### Task 19.1: Add Sentry Error Tracking
- **Status:** pending
- **Severity:** HIGH
- **Files:** `package.json`, `src/main.tsx`, `src/components/error-boundary.tsx`
- **Problem:** No error tracking. If the app crashes for a user, you have no visibility.
- **Changes required:**
  - [ ] Install `@sentry/react` package
  - [ ] Initialise Sentry in `src/main.tsx` with DSN from env var
  - [ ] Integrate with ErrorBoundary component
  - [ ] Add Sentry to Edge Functions (optional, lower priority)
  - [ ] Configure source map upload for meaningful stack traces

### Task 19.2: Add Uptime Monitoring
- **Status:** pending
- **Severity:** MEDIUM
- **Problem:** No uptime monitoring. You won't know if the app goes down until a user tells you.
- **Changes required:**
  - [ ] Set up BetterUptime, Checkly, or UptimeRobot (free tier is fine)
  - [ ] Monitor: `https://chester.benchiva.com` (frontend)
  - [ ] Monitor: Supabase project health endpoint
  - [ ] Configure alerts to email/Slack

### Task 19.3: Add Basic Audit Logging
- **Status:** pending
- **Severity:** HIGH (enterprise requirement)
- **Files:** New migration + new Edge Function or database triggers
- **Problem:** No record of who accessed what data, when. Required for SOC 2 and GDPR compliance.
- **Changes required:**
  - [ ] Create `audit_log` table:
    ```sql
    CREATE TABLE audit_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id),
      action text NOT NULL,
      resource_type text NOT NULL,
      resource_id uuid,
      metadata jsonb,
      ip_address inet,
      created_at timestamptz DEFAULT now()
    );
    ```
  - [ ] Enable RLS: only super_admin can SELECT
  - [ ] Add audit triggers for: scorecard creation/update, AI generation, data export, admin actions
  - [ ] Create admin UI to view audit logs (Phase 22)

### Task 19.4: Add Anthropic API Cost Monitoring
- **Status:** pending
- **Severity:** MEDIUM
- **Depends on:** 19.3
- **Problem:** No visibility into AI API spend. Critical given the current lack of rate limiting.
- **Changes required:**
  - [ ] Log token usage from Anthropic API responses in audit_log
  - [ ] Create a simple dashboard or weekly email report of usage
  - [ ] Set up Anthropic usage alerts in their dashboard

---

## Phase 20: GDPR & Legal Compliance

> **Priority:** HIGH (legal requirement for UK businesses)
> **Estimated effort:** 3-5 days (technical) + legal review
> **Dependencies:** 19.3 (audit logging needed first)

### Task 20.1: Verify Supabase Data Residency
- **Status:** pending
- **Severity:** HIGH
- **Problem:** Must confirm Supabase project is hosted in EU region for GDPR compliance.
- **Changes required:**
  - [ ] Check Supabase Dashboard > Settings > General for region
  - [ ] If not EU: plan migration to EU region (requires Supabase support)
  - [ ] Document the data residency in a compliance document

### Task 20.2: Create Privacy Policy Page
- **Status:** pending
- **Severity:** HIGH
- **Files:** New page `src/pages/privacy-policy.tsx`, route in `src/App.tsx`
- **Changes required:**
  - [ ] Create privacy policy covering: data collected, purpose, retention, rights
  - [ ] Add route `/privacy` (public, no auth required)
  - [ ] Link from login page footer
  - [ ] Get legal review

### Task 20.3: Create Terms of Service Page
- **Status:** pending
- **Severity:** HIGH
- **Files:** New page `src/pages/terms.tsx`, route in `src/App.tsx`
- **Changes required:**
  - [ ] Create terms of service document
  - [ ] Add route `/terms` (public, no auth required)
  - [ ] Link from login page footer
  - [ ] Get legal review

### Task 20.4: Implement Data Export (Right to Portability)
- **Status:** pending
- **Severity:** HIGH
- **Depends on:** None
- **Files:** New Edge Function `supabase/functions/export-user-data/index.ts`
- **Changes required:**
  - [ ] Create Edge Function that exports all data for a given business_id as JSON/CSV
  - [ ] Include: scorecards, submissions, targets, AI analyses
  - [ ] Add "Export My Data" button in company dashboard
  - [ ] Require auth + ownership check

### Task 20.5: Implement Account Deletion (Right to Erasure)
- **Status:** pending
- **Severity:** HIGH
- **Depends on:** 20.4
- **Files:** New Edge Function `supabase/functions/delete-user-data/index.ts`
- **Changes required:**
  - [ ] Create Edge Function that deletes all data for a user/business
  - [ ] Cascade: scorecards, submissions, targets, AI analyses, profile
  - [ ] Delete auth.users entry
  - [ ] Add "Delete My Account" option (with confirmation)
  - [ ] Log deletion in audit_log (anonymised) for compliance record

---

## Phase 21: Session & Auth Hardening

> **Priority:** MEDIUM
> **Estimated effort:** 1-2 days
> **Dependencies:** Phase 16 complete

### Task 21.1: Add Session Timeout / Idle Detection
- **Status:** pending
- **Severity:** MEDIUM
- **File:** `src/contexts/auth-context.tsx`
- **Problem:** Sessions persist indefinitely via auto-refresh. No idle timeout for shared computer scenarios.
- **Changes required:**
  - [ ] Add idle detection (30 min inactivity = auto sign-out)
  - [ ] Show warning modal at 25 minutes: "Your session will expire in 5 minutes"
  - [ ] Clear session data on timeout

### Task 21.2: Add Login Activity Logging
- **Status:** pending
- **Severity:** LOW
- **Depends on:** 19.3 (audit log table)
- **Changes required:**
  - [ ] Log successful and failed login attempts
  - [ ] Include: email, IP address, timestamp, success/failure
  - [ ] Visible to super_admin in audit log

---

## Phase 22: Admin Security Dashboard

> **Priority:** MEDIUM
> **Estimated effort:** 2-3 days
> **Dependencies:** 19.3 (audit log), 18.1 (rate limiting)

### Task 22.1: Create Security Overview Page
- **Status:** pending
- **File:** New `src/pages/admin/security.tsx`
- **Route:** `/admin/security`
- **Changes required:**
  - [ ] Show recent audit log entries
  - [ ] Show rate limit status
  - [ ] Show active sessions count
  - [ ] Show recent failed login attempts
  - [ ] Add to admin navigation

### Task 22.2: Create API Usage Dashboard
- **Status:** pending
- **Depends on:** 19.4
- **File:** New `src/pages/admin/api-usage.tsx`
- **Changes required:**
  - [ ] Show Anthropic API usage (token counts, costs)
  - [ ] Show Edge Function invocation counts
  - [ ] Daily/weekly/monthly views
  - [ ] Cost alerts configuration

---

## Phase 23: Multi-Tenancy Foundation (SaaS Enablement)

> **Priority:** HIGH (required before selling to other consulting firms)
> **Estimated effort:** 2-3 weeks
> **Dependencies:** Phases 16-20 complete (security must be solid first)

### Task 23.1: Add Organisation Table and Schema
- **Status:** pending
- **Severity:** HIGH
- **File:** New migration
- **Problem:** Application is hardcoded for single organisation ("Chester"). No tenant isolation.
- **Changes required:**
  - [ ] Create `organisations` table (id, name, slug, settings jsonb, created_at)
  - [ ] Add `organisation_id` foreign key to: `businesses`, `scorecards`, `data_requests`, `company_submissions`, `admins`, `invitations`, `meetings`, `audit_log`
  - [ ] Create migration to backfill existing data with a "Chester" organisation
  - [ ] Enable RLS on organisations table

### Task 23.2: Update All RLS Policies for Multi-Tenancy
- **Status:** pending
- **Depends on:** 23.1
- **File:** New migration
- **Changes required:**
  - [ ] Create `get_my_org_id()` helper function (from JWT claims)
  - [ ] Update auth hook to include `organisation_id` in JWT claims
  - [ ] Update ALL RLS policies to include `organisation_id` filtering
  - [ ] Ensure business_users can only see data from their organisation
  - [ ] Ensure admins can only manage their own organisation
  - [ ] Create `platform_admin` role for cross-org management

### Task 23.3: Update Frontend for Multi-Tenancy
- **Status:** pending
- **Depends on:** 23.2
- **Files:** Multiple - all hooks and pages
- **Changes required:**
  - [ ] Add organisation context provider
  - [ ] Update all Supabase queries to scope by organisation
  - [ ] Add organisation branding support (logo, name, colours)
  - [ ] Update navigation to show organisation name

### Task 23.4: Add Organisation Onboarding Flow
- **Status:** pending
- **Depends on:** 23.3
- **Files:** New pages and Edge Functions
- **Changes required:**
  - [ ] Create organisation registration page
  - [ ] Create first-admin setup wizard
  - [ ] Create business import for new organisations
  - [ ] Add trial period management (14/30 day trial)

---

## Phase 24: Billing & Subscriptions

> **Priority:** HIGH (required for SaaS revenue)
> **Estimated effort:** 1-2 weeks
> **Dependencies:** 23.1 (organisations must exist)

### Task 24.1: Integrate Stripe
- **Status:** pending
- **Files:** New Edge Functions + new pages
- **Changes required:**
  - [ ] Create Stripe account and products
  - [ ] Create `subscriptions` table
  - [ ] Create Edge Function for Stripe webhook handling
  - [ ] Create checkout flow for new organisations
  - [ ] Handle subscription lifecycle (trial, active, past_due, cancelled)

### Task 24.2: Implement Usage-Based Billing for AI Features
- **Status:** pending
- **Depends on:** 24.1, 19.4
- **Changes required:**
  - [ ] Track AI token usage per organisation
  - [ ] Set included AI credits per plan tier
  - [ ] Create overage billing via Stripe metered billing
  - [ ] Show usage in admin dashboard

### Task 24.3: Create Billing Management Page
- **Status:** pending
- **Depends on:** 24.1
- **File:** New `src/pages/admin/billing.tsx`
- **Changes required:**
  - [ ] Show current plan and usage
  - [ ] Manage payment method (Stripe Customer Portal)
  - [ ] View invoice history
  - [ ] Upgrade/downgrade plan

---

## Phase 25: Test Coverage

> **Priority:** MEDIUM (enterprise requirement)
> **Estimated effort:** 2-3 weeks
> **Dependencies:** Phases 16-17 complete (test the secured version)

### Task 25.1: Unit Tests for Auth & Security
- **Status:** pending
- **Files:** New test files in `src/__tests__/`
- **Changes required:**
  - [ ] Test ProtectedRoute role enforcement
  - [ ] Test auth context JWT parsing
  - [ ] Test consultant cannot access financial data
  - [ ] Test business_user cannot access other businesses

### Task 25.2: Integration Tests for Edge Functions
- **Status:** pending
- **Changes required:**
  - [ ] Test auth rejection on unauthenticated requests
  - [ ] Test CORS rejection for unknown origins
  - [ ] Test rate limiting enforcement
  - [ ] Test AI generation with valid auth

### Task 25.3: E2E Tests for Critical Flows
- **Status:** pending
- **Changes required:**
  - [ ] Test login flow for all three roles
  - [ ] Test scorecard creation and viewing
  - [ ] Test consultant view cannot see financial data
  - [ ] Test magic link invitation flow
  - [ ] Test data export

---

## Implementation Priority Order

```
WEEK 1 (IMMEDIATE):
  Phase 16 (Critical Security Fixes) ─── 4-5 hours
  Phase 17 (Database Hardening) ──────── 1-2 days
  ↓
WEEK 2:
  Phase 18 (Rate Limiting) ───────────── 1-2 days
  Phase 19 (Observability) ───────────── 2-3 days
  ↓
WEEK 3:
  Phase 20 (GDPR Compliance) ─────────── 3-5 days
  Phase 21 (Auth Hardening) ──────────── 1-2 days
  ↓
WEEK 4-5:
  Phase 22 (Admin Dashboard) ─────────── 2-3 days
  Phase 25 (Test Coverage) ───────────── ongoing
  ↓
WEEKS 6-8 (SaaS Enablement):
  Phase 23 (Multi-Tenancy) ───────────── 2-3 weeks
  Phase 24 (Billing) ─────────────────── 1-2 weeks
```

### Dependency Graph

```
Phase 16 (Critical Fixes)──┬──► Phase 18 (Rate Limiting)
                           │
Phase 17 (DB Hardening)────┤
                           │
                           ├──► Phase 21 (Auth Hardening)
                           │
Phase 19 (Observability)───┼──► Phase 22 (Admin Dashboard)
         │                 │
         └─► 19.3 ────────┼──► Phase 20 (GDPR)
                           │
                           └──► Phase 25 (Tests)

Phase 16+17+18+19+20 ─────────► Phase 23 (Multi-Tenancy)
                                      │
                                      └──► Phase 24 (Billing)
```

---
---

# Previous Feature Work (Phases 1-15)

> The following phases document the original feature development work.
> Phases 11-15 are COMPLETE. Phases 1-10 are PENDING (feature work paused for security hardening).

## Original Overview

Six major amendments required to the Chester Business Scorecard system:

1. **Historical Data Visibility** - Revenue/EBITDA history per company (2025 + 2026 targets)
2. **City Aggregate View** - Chester group-wide progress dashboard
3. **Two-Level Data Display** - Company vs City views with confidentiality
4. **Auto-fill Targets** - Pre-populate revenue/EBITDA targets on submission
5. **AI Analysis Enhancement** - Include historical data in AI prompts
6. **E-Profile Categorisation** - Report progress by E-Profile category (E0-E5)

---

## E-Profile Categories Reference

| Code | Name | Annual Revenue Range |
|------|------|---------------------|
| E0 | Entry | <£0.5m |
| E1 | Emerging | £0.5m-£1.5m |
| E2 | Expansion | £1.5m-£5m |
| E3 | Elevation | £5m-£11m |
| E4 | Established | £11m-£20m |
| E5 | Enterprise | £20m+ |

---

## Phase 1: Database Schema

### Task 1.1: Create company_annual_targets table
- **Status:** pending
- **File:** `supabase/migrations/20260205_add_annual_targets.sql`
- **Details:**
  - `id` (uuid PK)
  - `business_id` (uuid FK -> businesses)
  - `year` (integer)
  - `revenue_target` (numeric)
  - `ebitda_target` (numeric)
  - `monthly_revenue_targets` (jsonb, optional 12-value array)
  - `monthly_ebitda_targets` (jsonb, optional 12-value array)
  - `created_at`, `updated_at`, `created_by`
  - UNIQUE(business_id, year)

### Task 1.2: Create company_monthly_financials table
- **Status:** pending
- **Depends on:** 1.1
- **File:** `supabase/migrations/20260205_add_monthly_financials.sql`
- **Details:**
  - `id` (uuid PK)
  - `business_id` (uuid FK -> businesses)
  - `month` (text YYYY-MM)
  - `revenue_actual`, `revenue_target` (numeric)
  - `ebitda_actual`, `ebitda_target` (numeric)
  - `source` (text: 'import'|'submission'|'manual')
  - `company_submission_id` (uuid FK, nullable)
  - UNIQUE(business_id, month)
  - Indexes: business_id, month, (business_id, month DESC)

### Task 1.3: Add e_profile to businesses table
- **Status:** pending
- **Depends on:** 1.2
- **File:** `supabase/migrations/20260205_add_eprofile.sql`
- **Details:**
  - Add column `e_profile text CHECK (e_profile IN ('E0','E1','E2','E3','E4','E5'))`
  - Add column `latest_annual_revenue numeric`
  - Add column `latest_revenue_year integer`
  - Create `calculate_e_profile(numeric)` function
  - Create trigger to auto-update e_profile when revenue changes

### Task 1.4: Add EBITDA fields to company_submissions
- **Status:** pending
- **Depends on:** 1.3
- **File:** `supabase/migrations/20260205_add_ebitda_fields.sql`
- **Details:**
  - Add `ebitda_actual numeric`
  - Add `ebitda_target numeric`
  - Migrate existing net_profit_override data to ebitda fields

### Task 1.5: Create city_aggregate_view
- **Status:** pending
- **Depends on:** 1.4
- **File:** `supabase/migrations/20260205_add_city_view.sql`
- **Details:**
  - Monthly aggregates: total revenue/EBITDA target/actual
  - Business count (with/without EBITDA)
  - E-Profile breakdown (count and revenue per category)
  - Variance calculations

### Task 1.6: Add RLS policies for new tables
- **Status:** pending
- **Depends on:** 1.5
- **File:** `supabase/migrations/20260205_add_new_rls_policies.sql`
- **Details:**
  - `company_annual_targets`: super_admin full, consultant read, business_user own only
  - `company_monthly_financials`: super_admin full, consultant read, business_user own only
  - Create `is_super_admin()` helper function

### Task 1.7: Update TypeScript types
- **Status:** pending
- **Depends on:** 1.6
- **File:** `src/types/database.types.ts`
- **Details:**
  - Add `CompanyAnnualTargets` type
  - Add `CompanyMonthlyFinancials` type
  - Extend `Business` with `e_profile`, `latest_annual_revenue`, `latest_revenue_year`
  - Extend `CompanySubmission` with `ebitda_actual`, `ebitda_target`

---

## Phase 2: Data Migration & Import

### Task 2.1: Migrate existing data to new tables
- **Status:** pending
- **Depends on:** 1.7
- **File:** `supabase/migrations/20260205_migrate_existing_data.sql`
- **Details:**
  - Copy company_submissions with net_profit_override=true to have ebitda values
  - Create company_monthly_financials from existing company_submissions
  - Calculate and set e_profile for all existing businesses

### Task 2.2: Update Excel import to handle new fields
- **Status:** pending
- **Depends on:** 2.1
- **File:** `src/hooks/use-excel-import.ts`
- **Details:**
  - Add EBITDA target/actual to import mapping
  - Support importing into company_monthly_financials
  - Support setting annual targets during import
  - Support setting e_profile during import

### Task 2.3: Import 2025 historical data
- **Status:** pending
- **Depends on:** 2.2
- **Details:**
  - Import revenue/EBITDA history from Chester Results PDF data
  - Set 2025 targets for all businesses
  - Set 2026 targets for all businesses
  - Populate e_profile for all 15 Chester businesses based on Excel data

---

## Phase 3: Core Hooks

### Task 3.1: Create use-business-targets hook
- **Status:** pending
- **Depends on:** 1.7
- **File:** `src/hooks/use-business-targets.ts`
- **Details:**
  - `useBusinessTargets(businessId, year?)` - fetch targets
  - `useAllBusinessTargets(year?)` - admin view
  - `useUpsertBusinessTarget()` - mutation
  - `useBulkUpsertTargets()` - bulk mutation

### Task 3.2: Create use-monthly-financials hook
- **Status:** pending
- **Depends on:** 1.7
- **File:** `src/hooks/use-monthly-financials.ts`
- **Details:**
  - `useCompanyMonthlyFinancials(businessId, dateRange?)` - fetch company data
  - `useAllMonthlyFinancials(dateRange?)` - admin view
  - `useUpsertMonthlyFinancials()` - mutation

### Task 3.3: Create use-city-aggregate hook
- **Status:** pending
- **Depends on:** 1.7
- **File:** `src/hooks/use-city-aggregate.ts`
- **Details:**
  - `useCityAggregate(year?)` - fetch aggregate data
  - Returns monthly breakdown + YTD + YoY comparison
  - Uses city_aggregate_view

### Task 3.4: Create use-eprofile-report hook
- **Status:** pending
- **Depends on:** 1.7
- **File:** `src/hooks/use-eprofile-report.ts`
- **Details:**
  - `useEProfileReport(filters?)` - fetch grouped data
  - Returns businesses grouped by E-Profile with aggregates
  - Supports filtering by profile categories

---

## Phase 4: City Dashboard

### Task 4.1: Create city summary card component
- **Status:** pending
- **Depends on:** 3.3
- **File:** `src/components/city/city-summary-card.tsx`
- **Details:**
  - Large KPI cards for Revenue, EBITDA, EBITDA %
  - Target vs Actual with variance
  - Business count indicator

### Task 4.2: Create city month table component
- **Status:** pending
- **Depends on:** 3.3
- **File:** `src/components/city/city-month-table.tsx`
- **Details:**
  - Horizontal scrolling table (Jan-Dec + YTD)
  - Rows: Sales Target/Actual, EBITDA Target/Actual, EBITDA %, No. of Businesses
  - Match format from Chester Results PDF

### Task 4.3: Create city YoY comparison component
- **Status:** pending
- **Depends on:** 3.3
- **File:** `src/components/city/city-yoy-comparison.tsx`
- **Details:**
  - 2024 vs 2025/2026 comparison
  - Bar chart showing % increase by month
  - YTD total comparison

### Task 4.4: Create city commentary section
- **Status:** pending
- **Depends on:** 3.3
- **File:** `src/components/city/city-commentary-section.tsx`
- **Details:**
  - Brief commentary text area
  - Editable by admins
  - Bullet point format

### Task 4.5: Create City Dashboard page
- **Status:** pending
- **Depends on:** 4.1, 4.2, 4.3, 4.4
- **File:** `src/pages/city-dashboard.tsx`
- **Route:** `/city`
- **Details:**
  - Combines all city components
  - Year selector filter
  - Export PDF button
  - Accessible to all authenticated users

### Task 4.6: Add City Dashboard to navigation
- **Status:** pending
- **Depends on:** 4.5
- **Files:** `src/pages/home.tsx`, `src/pages/portfolio.tsx`
- **Details:**
  - Add "City Results" button to home page
  - Add link in portfolio page header

---

## Phase 5: Company Performance View

### Task 5.1: Create revenue-ebitda chart component
- **Status:** pending
- **Depends on:** 3.2
- **File:** `src/components/performance/revenue-ebitda-chart.tsx`
- **Details:**
  - Line chart with Target (dashed) vs Actual (solid)
  - Time filter: 6m, 12m, 24m, All
  - Dual display for Revenue and EBITDA

### Task 5.2: Create target-vs-actual table component
- **Status:** pending
- **Depends on:** 3.2
- **File:** `src/components/performance/target-vs-actual-table.tsx`
- **Details:**
  - Monthly breakdown table
  - Columns: Month, Rev Target, Rev Actual, Variance %, EBITDA Target, EBITDA Actual, Variance %

### Task 5.3: Create YTD summary card component
- **Status:** pending
- **Depends on:** 3.2
- **File:** `src/components/performance/ytd-summary-card.tsx`
- **Details:**
  - YTD totals for revenue and EBITDA
  - Progress bars showing % of annual target achieved

### Task 5.4: Create Company Performance page
- **Status:** pending
- **Depends on:** 5.1, 5.2, 5.3
- **File:** `src/pages/company-performance.tsx`
- **Route:** `/company/:businessId/performance`
- **Details:**
  - Combines performance chart components
  - RLS ensures companies only see their own data
  - Time range filter

### Task 5.5: Link performance page from company dashboard
- **Status:** pending
- **Depends on:** 5.4
- **File:** `src/pages/company/dashboard.tsx`
- **Details:**
  - Add "View Performance History" card/button
  - Navigate to `/company/:businessId/performance`

---

## Phase 6: Auto-fill Targets

### Task 6.1: Update unified-submit form to fetch targets
- **Status:** pending
- **Depends on:** 3.1
- **File:** `src/pages/unified-submit.tsx`
- **Details:**
  - Fetch business targets using useBusinessTargets hook
  - When month is selected, auto-populate revenue/EBITDA targets
  - Show visual indicator for pre-filled fields

### Task 6.2: Update company-submit form to fetch targets
- **Status:** pending
- **Depends on:** 3.1
- **File:** `src/pages/company-submit.tsx`
- **Details:**
  - Fetch targets for the business
  - Auto-populate revenue target and EBITDA target
  - Make fields read-only when pre-filled with explanation text

### Task 6.3: Update scorecard form to use targets
- **Status:** pending
- **Depends on:** 3.1
- **File:** `src/pages/scorecard.tsx`
- **Details:**
  - When creating new scorecard, fetch targets
  - Pre-populate target fields
  - Calculate variance from targets

---

## Phase 7: E-Profile Reporting

### Task 7.1: Create E-Profile filter component
- **Status:** pending
- **Depends on:** 3.4
- **File:** `src/components/eprofile/eprofile-filter.tsx`
- **Details:**
  - Multi-select checkbox group for E0-E5
  - Styled consistently with existing filters

### Task 7.2: Create E-Profile distribution chart
- **Status:** pending
- **Depends on:** 3.4
- **File:** `src/components/eprofile/eprofile-distribution-chart.tsx`
- **Details:**
  - Horizontal bar chart showing business count by E-Profile
  - Option to show with/without EBITDA data

### Task 7.3: Create E-Profile aggregate table
- **Status:** pending
- **Depends on:** 3.4
- **File:** `src/components/eprofile/eprofile-aggregate-table.tsx`
- **Details:**
  - Table grouped by E-Profile
  - Columns: Profile, # Businesses, Rev Target, Rev Actual, %, EBITDA, EBITDA %

### Task 7.4: Create E-Profile detail list
- **Status:** pending
- **Depends on:** 3.4
- **File:** `src/components/eprofile/eprofile-detail-list.tsx`
- **Details:**
  - Expandable list showing businesses within each E-Profile
  - Highlight underperformers that might be masked by larger companies
  - Flag businesses significantly below target

### Task 7.5: Create E-Profile Report page
- **Status:** pending
- **Depends on:** 7.1, 7.2, 7.3, 7.4
- **File:** `src/pages/eprofile-report.tsx`
- **Route:** `/eprofile`
- **Details:**
  - Admin-only access
  - Combines E-Profile components
  - Filter controls

### Task 7.6: Add E-Profile field to business edit dialog
- **Status:** pending
- **Depends on:** 1.3
- **File:** `src/components/admin/business-dialog.tsx`
- **Details:**
  - Add E-Profile dropdown to business create/edit dialog
  - Options: E0, E1, E2, E3, E4, E5
  - Show calculated E-Profile based on revenue (with override option)

---

## Phase 8: AI Analysis Enhancement

### Task 8.1: Update generate-analysis edge function
- **Status:** pending
- **Depends on:** 3.2
- **File:** `supabase/functions/generate-analysis/index.ts`
- **Details:**
  - Fetch company's historical monthly financials (last 12 months)
  - Fetch company's annual targets
  - Include E-Profile context in prompt
  - Add historical trend analysis to AI prompt
  - Compare current performance to historical averages

### Task 8.2: Update AI analysis prompt template
- **Status:** pending
- **Depends on:** 8.1
- **File:** `supabase/functions/generate-analysis/index.ts`
- **Details:**
  - Add section for historical context
  - Include YTD performance vs target
  - Include trend direction (improving/declining)
  - Reference E-Profile expectations for businesses of that size

### Task 8.3: Update AI analysis output schema
- **Status:** pending
- **Depends on:** 8.2
- **File:** `supabase/functions/generate-analysis/index.ts`
- **Details:**
  - Add `historicalContext` field to output
  - Add `trajectoryAssessment` field
  - Update tool definition for Claude

---

## Phase 9: Admin Target Management

### Task 9.1: Create target upload form component
- **Status:** pending
- **Depends on:** 3.1
- **File:** `src/components/admin/target-upload-form.tsx`
- **Details:**
  - Form to set/edit targets for a business
  - Year selector
  - Annual revenue/EBITDA targets
  - Optional monthly breakdown grid

### Task 9.2: Create target grid editor component
- **Status:** pending
- **Depends on:** 3.1
- **File:** `src/components/admin/target-grid-editor.tsx`
- **Details:**
  - Inline editable grid for quick target entry
  - 12 columns (Jan-Dec) x 2 rows (Revenue, EBITDA)
  - Auto-calculate totals

### Task 9.3: Create Targets Management page
- **Status:** pending
- **Depends on:** 9.1, 9.2
- **File:** `src/pages/admin/targets.tsx`
- **Route:** `/admin/targets`
- **Details:**
  - Admin-only access
  - List all businesses with their targets
  - Bulk import from Excel option
  - Edit individual business targets

### Task 9.4: Add targets link to admin navigation
- **Status:** pending
- **Depends on:** 9.3
- **File:** `src/pages/admin.tsx`
- **Details:**
  - Add "Manage Targets" card/link in admin area
  - Navigate to `/admin/targets`

---

## Phase 10: Route Updates

### Task 10.1: Add new routes to App.tsx
- **Status:** pending
- **Depends on:** 4.5, 5.4, 7.5, 9.3
- **File:** `src/App.tsx`
- **Details:**
  - `/city` - CityDashboardPage (all authenticated)
  - `/company/:businessId/performance` - CompanyPerformancePage (business_user own or admin)
  - `/eprofile` - EProfileReportPage (admin only)
  - `/admin/targets` - TargetsManagementPage (admin only)

---

## Implementation Order

**Week 1: Foundation**
- Phase 1 (Database Schema) - All tasks
- Phase 2 (Data Migration) - Tasks 2.1, 2.2

**Week 2: Core Features**
- Phase 3 (Core Hooks) - All tasks
- Phase 6 (Auto-fill Targets) - All tasks

**Week 3: City Dashboard**
- Phase 4 (City Dashboard) - All tasks
- Phase 2.3 (Import historical data)

**Week 4: Company & E-Profile**
- Phase 5 (Company Performance) - All tasks
- Phase 7 (E-Profile) - All tasks

**Week 5: AI & Admin**
- Phase 8 (AI Enhancement) - All tasks
- Phase 9 (Admin Management) - All tasks
- Phase 10 (Routes) - All tasks

---

## Critical Files Reference

| File | Purpose |
|------|---------|
| `supabase/migrations/00000000_full_schema.sql` | Reference for migration patterns |
| `src/types/database.types.ts` | TypeScript types to extend |
| `src/hooks/use-scorecards.ts` | Pattern for new hooks |
| `src/lib/portfolio-aggregator.ts` | Pattern for aggregation logic |
| `src/components/charts/score-trend-chart.tsx` | Pattern for Recharts usage |
| `src/pages/unified-submit.tsx` | Form to modify for auto-fill |
| `supabase/functions/generate-analysis/index.ts` | AI analysis to enhance |

---

## Notes

- All monetary values in GBP (£)
- Month format: YYYY-MM (e.g., "2026-01")
- 15 Chester businesses (9 with EBITDA, 6 without per PDF)
- Current E-Profile distribution from Excel:
  - E0: 4 (Cheshire Fire, Clock Corner, Trigo, Unistow)
  - E1: 2 (Haysdale, Keystone)
  - E2: 6 (Chespack, Hardwoods, HiSpace, Merlin, OptimOil, Spectrum)
  - E3: 2 (Alphabond, Lancastria)
  - E4: 1 (RVT Group)

---

# Consultant View & Display Amendments (2026-02-05)

> Source: Shane meetings (2026-02-02, 2026-02-05)
> Status: ✅ ALL COMPLETE (2026-02-05)

## Phase 11: Consultant View Safety (PRIORITY) ✅

### P2: Remove Admin Functions from Consultant View
- [x] **P2.1** Hide Send Invitations button from consultant view
  - File: `src/pages/portfolio.tsx`
  - Action: Wrap bulk invitation panel in role check
- [x] **P2.2** Hide Send Reminders functionality from consultant view
  - File: `src/components/submission-status-panel.tsx`
- [x] **P2.3** Audit other admin-only actions across pages

### P5: Hide Axis Values on Consultant Charts
- [x] **P5.1** Add `hideAxisValues` prop to score-trend-chart
  - File: `src/components/charts/score-trend-chart.tsx`
- [x] **P5.2** Add `hideAxisValues` prop to section-breakdown-chart
  - File: `src/components/charts/section-breakdown-chart.tsx`
- [x] **P5.3** Add `hideAxisValues` prop to section-comparison-chart
  - File: `src/components/charts/section-comparison-chart.tsx`
- [x] **P5.4** Apply consultant check to charts page
  - File: `src/pages/charts.tsx`
- [x] **P5.5** Apply to business detail page charts
  - File: `src/pages/business.tsx`

---

## Phase 12: Display Improvements ✅

### P1: Display Four Questions on Scorecards
- [x] **P1.1** Link company submission insights to scorecard display
  - Files: `src/pages/business.tsx`, `src/components/business-scorecard-view.tsx`
- [x] **P1.2** Create InsightsCard component
  - File: `src/components/insights-card.tsx` (new)
- [x] **P1.3** Add insights to scorecard PDF export
  - File: `src/components/pdf/scorecard-pdf.tsx`
- [x] **P1.4** Add insights to comparison view
  - File: `src/pages/compare.tsx`

### P4: Filter Section Improvements
- [x] **P4.1** Improve year selector display format
  - File: `src/pages/city-dashboard.tsx`
- [x] **P4.2** Create unified FilterBar component
  - File: `src/components/filter-bar.tsx` (new)
- [x] **P4.3** Apply FilterBar to City Dashboard
- [x] **P4.4** Apply FilterBar to E-Profile Report
- [x] **P4.5** Apply FilterBar to Portfolio page

---

## Phase 13: Enhanced Features ✅

### P6: Consultant Executive Summary AI
- [x] **P6.1** Create consultant-specific analysis prompt
  - File: `supabase/functions/generate-analysis/index.ts`
- [x] **P6.2** Add view mode to analysis hook
  - File: `src/hooks/use-ai-analysis.ts`
- [x] **P6.3** Update portfolio analysis
  - File: `supabase/functions/generate-portfolio-analysis/index.ts`
- [x] **P6.4** Update meeting prep
  - File: `supabase/functions/generate-meeting-summary/index.ts`

### P3: City Dashboard Graphs
- [x] **P3.1** Create CityRevenueChart component
  - File: `src/components/charts/city-revenue-chart.tsx` (new)
- [x] **P3.2** Create CityEbitdaChart component
  - File: `src/components/charts/city-ebitda-chart.tsx` (new)
- [x] **P3.3** Create CityEProfileChart component
  - File: `src/components/charts/city-eprofile-chart.tsx` (new)
- [x] **P3.4** Add graph/table toggle to City Dashboard
  - File: `src/pages/city-dashboard.tsx`

---

## Phase 14: Polish ✅

### P7: Additional Items
- [x] **P7.1** Remove "Not Applicable" from form questions (keep only for Leadership)
  - File: `src/pages/company-submit.tsx`
- [x] **P7.2** Add actions from portfolio view
  - File: `src/pages/portfolio.tsx`
- [x] **P7.3** Print all scorecards functionality
  - File: `src/pages/portfolio.tsx`

---

## Implementation Summary

**Commits:**
- `f824598` - feat(charts): add hideAxisValues prop for consultant view
- `d1fb181` - feat: add unified FilterBar component for consistent filtering
- `aee6913` - feat: display company insights on scorecard view and PDF export
- `6bf4244` - feat: add City Dashboard graph view with revenue/EBITDA/E-Profile charts
- `b476f92` - feat: consultant view restrictions and AI executive summaries

**New Files Created:**
- `src/components/filter-bar.tsx`
- `src/components/insights-card.tsx`
- `src/components/charts/city-revenue-chart.tsx`
- `src/components/charts/city-ebitda-chart.tsx`
- `src/components/charts/city-eprofile-chart.tsx`

---

# Consultant View Financial Data Fixes (2026-02-05)

> Source: User testing of consultant view (scott@brandedai.net)
> Status: ✅ ALL TASKS COMPLETE (2026-02-05)

**Verified:**
- Performance Page: YTD cards hidden, no £ values, no Monthly Detail table ✅
- Charts Page: Percentage scores (0-100) visible ✅
- AI Analysis: Consultant-specific version without £ figures ✅
- Company Insights: Now visible for consultants (RLS fix applied) ✅

## Overview

Fix data visibility inconsistencies for consultant role users. Consultants should see scores and trends but NOT financial £ values.

### Email Address Clarification
- `scott@brandedai.net` = **consultant** (test account)
- `scott@brandedai.co.uk` = **super_admin** (production account)

---

## Phase 15: Consultant View Financial Data Fixes

### Task 15.1: Fix Performance Page - Hide £ values (HIGH)
**Status:** ✅ COMPLETE
**File:** `src/pages/company-performance.tsx`

**Problem:** No role-based filtering - consultants see all £ values and monthly detail table.

**Changes:**
- [x] Import `useAuth` and get `userRole`
- [x] Create `isConsultant` check
- [x] Hide/mask YTD Summary card £ values for consultants (shows "—")
- [x] Hide variance badges for consultants
- [x] Hide chart Y-axis £ values for consultants
- [x] Hide Tooltip values for consultants
- [x] Hide Monthly Detail table entirely for consultants

**Verification:**
- Log in as `scott@brandedai.net` (consultant)
- Navigate to Performance tab
- Confirm: No £ values visible, no monthly detail table

---

### Task 15.2: Fix Charts Page - Show Percentage Scores (MEDIUM)
**Status:** ✅ COMPLETE
**File:** `src/pages/charts.tsx`

**Problem:** Incorrectly hiding percentage scores (0-100) for consultants. Percentages are NOT financial data.

**Changes:**
- [x] Remove `hideAxisValues={userRole === 'consultant'}` from ScoreTrendChart
- [x] Remove `hideAxisValues={userRole === 'consultant'}` from SectionBreakdownChart
- [x] Remove `hideAxisValues={userRole === 'consultant'}` from SectionComparisonChart
- [x] Remove unused `useAuth` import

**Verification:**
- Log in as `scott@brandedai.net` (consultant)
- Navigate to Charts tab
- Confirm: Score percentages (0-100) visible on all charts

---

### Task 15.3: Fix AI Analysis Caching (HIGH)
**Status:** ✅ COMPLETE
**Files:**
- `src/hooks/use-ai-analysis.ts`
- `src/components/ai-analysis-panel.tsx`

**Problem:** AI analysis cached with `isConsultantView` flag. If super_admin generates first, consultant sees full figures.

**Changes:**
- [x] Check `isConsultantView` flag when consultant views cached analysis
- [x] If mismatch (consultant viewing admin analysis), auto-regenerate
- [x] Consultant analysis uses qualitative language only (via Edge Function)

**Implementation:**
- Added role check in `ai-analysis-panel.tsx` useEffect
- If consultant views analysis where `isConsultantView !== true`, auto-regenerates
- New analysis generated with consultant-appropriate prompt

**Verification:**
- Log in as super_admin, generate AI analysis
- Log in as consultant, view same scorecard
- Confirm: Consultant sees qualitative analysis without £ figures

---

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| super_admin | scott@benchiva.com | password |
| consultant | scott@brandedai.net | password |
| business_user | contact@scottmarkham.com | password |

## Dependencies

```
Task 15.1 (Performance) ───┐
                           │
Task 15.2 (Charts) ────────┼─► Independent - all run in parallel
                           │
Task 15.3 (AI Analysis) ───┤
                           │
Task 15.4 (RLS Fix) ───────┘
```

### Task 15.4: Fix RLS - Consultant Access to Company Insights (HIGH)
**Status:** ✅ COMPLETE
**File:** `supabase/migrations/20260205_fix_consultant_rls.sql`

**Problem:** `is_admin()` function only returned true for `user_role = 'admin'`, but consultants have `user_role = 'consultant'`. This blocked consultants from querying `company_submissions` table, causing Company Insights section to be missing.

**Changes:**
- [x] Updated `is_admin()` to return true for `'admin'`, `'super_admin'`, AND `'consultant'`
- [x] Applied migration to live Supabase database
- [x] Committed migration file to repo

**Verification:**
- Log in as consultant
- View any scorecard with company submission data
- Confirm: Company Insights section now visible

---

## Reference: AUTH-08

Formal authorization requirement that consultants must NOT see raw financial figures.
Currently implemented in:
- `src/components/submitted-financials-display.tsx` (returns null for consultant)
- `src/components/compare/comparison-columns.tsx` (filters financial rows)
- `src/pages/company-performance.tsx` (hides YTD cards, axis values, tooltips, monthly table)
- `src/hooks/use-ai-analysis.ts` (generates consultant-specific AI analysis)

---

# Security Status (2026-02-10)

> **Full audit report:** `SECURITY_AUDIT_2026-02-10.md`

## Consultant View Fixes: ✅ COMPLETE (UI Layer Only)

All consultant view UI restrictions are working:
- Performance page: No £ values visible in UI
- Charts page: Percentage scores visible (not financial)
- AI Analysis: Consultant version without £ figures
- Company Insights: Now visible (qualitative data)

**WARNING:** Financial data filtering is CLIENT-SIDE ONLY. Consultants can still access raw financial data via browser DevTools / Supabase JS client. See Task 17.1 for the database-level fix.

## Critical Security Issues (from 2026-02-10 audit)

| Severity | Issue | Task | Status |
|----------|-------|------|--------|
| CRITICAL | AI Edge Functions have no authentication | 16.1, 16.2, 16.3 | ✅ FIXED |
| CRITICAL | Consultant can access financial data via DB queries | 17.1 | ✅ FIXED (apply migration) |
| HIGH | Wildcard CORS on all Edge Functions | 16.4 | ✅ FIXED |
| HIGH | No rate limiting on any endpoint | 18.1-18.3 | pending |
| HIGH | SECURITY DEFINER views bypass RLS | 17.2 | ✅ FIXED (apply migration) |
| HIGH | No security headers on frontend | 16.5 | ✅ FIXED |
| MEDIUM | JWT claims logged to browser console | 16.6 | ✅ FIXED |
| MEDIUM | Mutable search_path on DB functions | 17.3 | ✅ FIXED (apply migration) |
| MEDIUM | Weak password policy (6 chars, no complexity) | 17.4 | ✅ FIXED (12 char minimum) |
| MEDIUM | Error messages leak internal details | 17.5 | ✅ FIXED |
| MEDIUM | ReactQueryDevtools in production | 16.7 | ✅ FIXED |
| LOW | Source maps in production build | 16.7 | ✅ FIXED |

## Supabase Lint Advisories (Still Outstanding)

| Issue | Entity | Description | Task |
|-------|--------|-------------|------|
| SECURITY DEFINER | `city_monthly_aggregate` | View bypasses RLS | 17.2 |
| SECURITY DEFINER | `city_ytd_aggregate` | View bypasses RLS | 17.2 |
| SECURITY DEFINER | `eprofile_monthly_aggregate` | View bypasses RLS | 17.2 |
| search_path mutable | Multiple functions | `is_admin`, `get_my_business_id`, etc. | 17.3 |
| Permissive RLS | `company_submissions` | INSERT uses `true` (intentional for magic link) | N/A |
| Leaked password protection | Auth | Feature disabled | 17.4 |

---

# Bug Fixes

## E-Profile Distribution Chart Center Label (2026-02-05)

**Status:** ✅ FIXED

**Problem:** Center label ("14 Businesses") in E-Profile donut chart was not centred in the donut hole. Multiple attempts using CSS absolute positioning failed due to ResponsiveContainer's dynamic sizing.

**Solution:** Use Recharts' native `<Label>` component with `position="center"` and `dy` offsets for multi-line text. This renders SVG text at the exact chart coordinates.

**File:** `src/components/charts/city-eprofile-chart.tsx`

**Changes:**
```tsx
<Pie data={chartData} cx="50%" cy="45%" innerRadius={60} outerRadius={110}>
  {/* Cell mapping... */}
  <Label
    value={total}
    position="center"
    dy={-10}
    style={{ fontSize: 28, fontWeight: 700, fill: '#0f172a' }}
  />
  <Label
    value="Businesses"
    position="center"
    dy={16}
    style={{ fontSize: 14, fill: '#64748b' }}
  />
</Pie>
```

**Reference:** [Recharts Issue #191](https://github.com/recharts/recharts/issues/191)

**Commits:**
- `b9dd797` - fix(chart): use Recharts Label component with position=center
