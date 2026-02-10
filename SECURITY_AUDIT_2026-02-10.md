# Chester Business Scorecard - Security & Enterprise Readiness Audit

> **Date:** 2026-02-10
> **Auditor:** Claude Code (Opus 4.6)
> **Scope:** Full codebase security audit, deployment assessment, SaaS readiness evaluation
> **Status:** Read-only audit - NO changes made

---

## Executive Summary

Chester is a functional, well-structured application for its current use case (single consulting firm, ~20 businesses). However, it has **significant security gaps** that would block enterprise sales and create liability risks. The most critical issues are **unauthenticated AI Edge Functions** (anyone can burn your Anthropic API credits), **client-side-only financial data filtering** (consultants can access raw financial data via browser DevTools), and **wildcard CORS on all APIs**.

**Overall Readiness Score: 4/10 for enterprise SaaS**

The good news: the architecture is sound, the role system is well-designed, and most issues are fixable without major rewrites.

---

## Part 1: Security Findings

### CRITICAL Severity

#### SEC-01: AI Edge Functions Have No Authentication
**Files:** `supabase/functions/generate-analysis/index.ts`, `supabase/functions/generate-portfolio-analysis/index.ts`
**Risk:** Anyone who knows the Supabase project URL can call these functions and burn your Anthropic API credits. No JWT verification, no auth header check, no rate limiting.

- `generate-analysis` - Zero auth checks. Directly processes JSON body and calls Claude API.
- `generate-portfolio-analysis` - Zero auth checks. Same issue.
- `generate-meeting-summary` - Has OPTIONAL auth (line 258: `if (authHeader)` - processes without auth too).

**Impact:** Unlimited API cost exposure. An attacker could run up thousands of pounds in Claude API charges in minutes.

**Fix:** Add mandatory JWT verification to all three functions. Verify the token via `supabase.auth.getUser(token)` and check the user's role before processing.

---

#### SEC-02: Consultant Financial Data Accessible via Database Queries
**Files:** `supabase/migrations/20260205_fix_consultant_rls.sql`, `src/components/submitted-financials-display.tsx`
**Risk:** Consultant role users can access ALL financial data (revenue, EBITDA, gross profit, wages) directly through the Supabase JS client. The "hiding" is purely cosmetic - React components filter what's displayed, but the data is fetched to the browser.

**How it works:**
1. `is_admin()` returns `true` for consultants (by design, for RLS)
2. RLS allows consultants to SELECT from `company_submissions` (which contains all financial figures)
3. React components hide the numbers in the UI
4. But a consultant can open browser DevTools > Console and run:
   ```js
   const { data } = await supabase.from('company_submissions').select('*')
   console.log(data) // All financial data exposed
   ```

**Impact:** Complete bypass of AUTH-08 (consultant financial data restriction). Any consultant with basic technical knowledge can see all financial figures.

**Fix:** Create a database view or RPC function that returns only non-financial columns for consultants. Or create separate RLS policies that filter financial columns at the database level using column-level security or a consultant-specific view.

---

### HIGH Severity

#### SEC-03: Wildcard CORS on ALL Edge Functions
**Files:** Every file in `supabase/functions/*/index.ts`
**Risk:** All Edge Functions use `'Access-Control-Allow-Origin': '*'` which allows ANY website to make cross-origin requests to your API.

**Impact:** An attacker could create a malicious website that calls your Edge Functions using a victim's browser session. Combined with SEC-01, this dramatically increases the attack surface.

**Fix:** Replace `'*'` with your actual domain: `'https://chester.benchiva.com'`. For development, use an environment variable to allow localhost.

---

#### SEC-04: No Rate Limiting on Any Endpoint
**Risk:** Zero rate limiting across all 12 Edge Functions. This affects:
- AI generation functions (API cost exposure)
- `send-company-invite` and `send-admin-invite` (email spam vector)
- `create-company-account` (brute-force account creation)
- `send-reminders` (bulk email abuse)

**Fix:** Implement rate limiting via Supabase Edge Function middleware or use an API gateway. At minimum: 5 AI generations per user per hour, 10 invitations per admin per day.

---

#### SEC-05: SECURITY DEFINER Views Bypass RLS
**File:** `supabase/migrations/20260205_add_city_aggregate_view.sql`
**Risk:** Three views use `SECURITY DEFINER` (default for CREATE VIEW in Supabase):
- `city_monthly_aggregate`
- `city_ytd_aggregate`
- `eprofile_monthly_aggregate`

These bypass RLS entirely. Any authenticated user (including `business_user`) can query city-wide aggregate financial data. A business_user could see total revenue/EBITDA for all Chester businesses combined.

**Fix:** Recreate views with `SECURITY INVOKER` so they respect the calling user's RLS policies. Or add explicit role checks within the view CTEs.

---

#### SEC-06: No Security Headers on Frontend
**Files:** `vercel.json`, `index.html`
**Risk:** The application has zero security headers:
- No Content Security Policy (CSP)
- No `X-Content-Type-Options: nosniff`
- No `X-Frame-Options: DENY`
- No `Strict-Transport-Security` (HSTS)
- No `Referrer-Policy`
- No `Permissions-Policy`

**Impact:** Vulnerable to clickjacking, MIME-type attacks, and reduced XSS protection. Enterprise security scanners will flag this immediately.

**Fix:** Add security headers to `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co" }
      ]
    }
  ]
}
```

---

### MEDIUM Severity

#### SEC-07: JWT Claims Logged to Browser Console in Production
**File:** `src/contexts/auth-context.tsx:53`
```typescript
console.log('[Auth] JWT decoded claims:', { user_role: decoded.user_role, business_id: decoded.business_id })
```
**Risk:** Every page load logs the user's role and business_id to the browser console. While not directly exploitable, it leaks internal system architecture to anyone who opens DevTools.

**Fix:** Remove all console.log statements from production code, or wrap in `if (import.meta.env.DEV)` checks.

---

#### SEC-08: 61 Console Statements Across 35 Source Files
**Risk:** Widespread `console.log/warn/error` usage across the codebase. Some may leak:
- Auth tokens or session data
- Business IDs and internal identifiers
- API error details
- Financial data during processing

Key files with multiple console statements:
- `src/lib/validation-helpers.ts` (7 occurrences)
- `src/components/admin/company-emails-manager.tsx` (5 occurrences)
- `src/components/auth/login-form.tsx` (4 occurrences)
- `src/pages/admin/import-businesses.tsx` (4 occurrences)

**Fix:** Strip console.* in production builds via Vite config:
```typescript
build: {
  minify: 'terser',
  terserOptions: {
    compress: { drop_console: true }
  }
}
```

---

#### SEC-09: Mutable search_path on Database Functions
**Functions affected:** `is_admin()`, `get_my_business_id()`, `handle_new_user()`, `custom_access_token_hook()`
**Risk:** Functions don't set an explicit `search_path`, making them potentially vulnerable to search_path manipulation attacks. A malicious user could create objects in a schema that gets resolved first.

**Fix:** Add `SET search_path = public` to all function definitions. Example:
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(...)
$$ LANGUAGE sql STABLE SET search_path = public;
```

---

#### SEC-10: Weak Password Policy
**File:** `supabase/functions/create-company-account/index.ts:83`
**Risk:** Minimum password length is only 6 characters. No complexity requirements (uppercase, numbers, symbols). Supabase's leaked password protection is disabled.

**Fix:** Increase minimum to 8+ characters. Enable Supabase's HaveIBeenPwned password checking in the dashboard. Add client-side complexity requirements.

---

#### SEC-11: Error Messages Leak Internal Details
**Files:** Multiple Edge Functions
**Risk:** Error responses include `error.message` from Supabase/Anthropic SDKs, which can reveal:
- Database schema details
- API configuration
- Internal error codes

Example from `create-company-account`:
```typescript
JSON.stringify({ error: `Failed to create account: ${createError.message}` })
```

**Fix:** Return generic error messages to clients. Log detailed errors server-side only.

---

#### SEC-12: ReactQueryDevtools Included in Production
**File:** `src/App.tsx:186`
**Risk:** TanStack Query DevTools are bundled in production. Any user can open them and inspect all cached queries, including financial data responses.

**Fix:** Conditionally import only in development:
```typescript
const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then(d => ({ default: d.ReactQueryDevtools }))
)
// Only render in dev
{import.meta.env.DEV && <ReactQueryDevtools />}
```

---

### LOW Severity

#### SEC-13: dangerouslySetInnerHTML Usage
**File:** `src/components/ui/chart.tsx:79`
**Risk:** Using `dangerouslySetInnerHTML` in the chart component. This is from shadcn/ui so the content is likely safe, but worth auditing the data flow.

#### SEC-14: No Audit Logging
**Risk:** No record of who accessed what data, when. Critical for enterprise compliance (SOC 2, GDPR).

#### SEC-15: No Session Timeout
**Risk:** Sessions persist until the Supabase JWT expires (default 1 hour, auto-refreshes). No idle timeout mechanism. A shared computer scenario could expose data.

#### SEC-16: Source Maps Likely Included in Production Build
**Risk:** Default Vite config generates source maps, exposing full source code to anyone who inspects the built assets.

**Fix:** Add `build: { sourcemap: false }` to `vite.config.ts`.

---

## Part 2: Deployment & Infrastructure Assessment

### Current Architecture
```
User Browser ──> Vercel (React SPA) ──> Supabase (PostgreSQL + Edge Functions + Auth)
                                    ──> Anthropic API (via Edge Functions)
                                    ──> Resend (email delivery)
```

### Vercel Assessment

| Criteria | Current State | Enterprise Requirement |
|----------|--------------|----------------------|
| Plan | Likely Hobby/Pro | Enterprise needed for SLA |
| SOC 2 | Available on Enterprise | Required |
| Data Residency | US default | UK/EU needed for GDPR |
| DDoS Protection | Basic | Advanced DDoS on Enterprise |
| Uptime SLA | None (Hobby/Pro) | 99.99% on Enterprise |
| Custom Domain | Yes | Yes |
| SSL | Auto-provisioned | Auto-provisioned |
| Edge Network | Global CDN | Good for SPA delivery |
| WAF | Not available | Need external WAF |
| Security Headers | Not configured | Must configure |

**Verdict on Vercel:** Vercel is **perfectly adequate** for hosting a React SPA at this scale. It's a static file host with a CDN - the security-critical parts are all in Supabase. Vercel Enterprise adds SOC 2 compliance and SLA guarantees, but for a 20-business deployment, Vercel Pro (£16/month) is sufficient. The real concerns are in the Supabase layer, not Vercel.

**Key Vercel actions needed:**
1. Configure security headers in `vercel.json`
2. Set up custom domain with proper SSL
3. Disable source maps in production build
4. Consider Vercel Enterprise only if customers specifically require Vercel's SOC 2

### Supabase Assessment

| Criteria | Current State | Enterprise Requirement |
|----------|--------------|----------------------|
| Plan | Unknown (check dashboard) | Pro minimum, Enterprise preferred |
| SOC 2 Type II | Available on Pro+ | Required |
| HIPAA | Available on Enterprise | Not needed for this |
| Data Residency | Check region | EU (London or Frankfurt) |
| Backups | Daily on Pro (7 days) | Point-in-time on Enterprise |
| Connection Pooling | PgBouncer included | Adequate for 20 businesses |
| Edge Functions | Deno-based | No built-in rate limiting |
| Auth | GoTrue-based | Solid for this use case |

**Verdict on Supabase:** Supabase Pro is the **minimum viable tier** for this product. It provides SOC 2 Type II compliance, daily backups, and email support. For selling to enterprise clients, you should verify:
1. Which region your project is hosted in (needs to be EU for GDPR)
2. That you're on Pro plan or above
3. Point-in-time recovery is available

### Recommended Architecture for SaaS Scale

For selling to multiple consulting firms:
```
User Browser ──> Vercel Pro (React SPA)
                   │
                   ├──> Supabase Pro/Enterprise (PostgreSQL + Auth)
                   │      ├── RLS-based multi-tenancy (add org_id to all tables)
                   │      ├── EU region for GDPR
                   │      └── Separate Edge Functions per concern
                   │
                   ├──> Anthropic API (via Supabase Edge Functions + rate limiting)
                   │
                   ├──> Resend (transactional email)
                   │
                   └──> Stripe (billing & subscriptions)

Observability Layer:
  ├── Sentry (error tracking)
  ├── PostHog or Mixpanel (product analytics)
  └── BetterUptime or Checkly (uptime monitoring)
```

---

## Part 3: SaaS Readiness Assessment

### What's Working Well
1. **Role-based access control** - Well-designed 3-tier role system
2. **JWT custom claims** - Proper auth hook for role injection
3. **RLS policies** - Good foundation (with fixes needed)
4. **Component architecture** - Clean separation of concerns
5. **TypeScript strict mode** - Catches errors at compile time
6. **Zod validation** - Forms are properly validated
7. **TanStack Query** - Good server state management
8. **AI integration** - Solid Claude API usage with tool calling

### Critical Gaps for SaaS

#### GAP-01: No Multi-Tenancy (Blocker)
The application is hardcoded for a single organisation ("Chester"). To sell to multiple consulting firms:
- Need `organisation_id` on all tables
- Need tenant isolation in RLS policies
- Need per-org configuration (branding, settings)
- Need org-level admin separate from super_admin

**Effort:** Major refactor (~2-3 weeks)

#### GAP-02: No Billing Integration (Blocker)
No Stripe or payment processing. Cannot charge customers.
- Need subscription management
- Need usage-based billing (AI credits per org)
- Need invoicing integration

**Effort:** ~1 week

#### GAP-03: No Self-Service Onboarding (Blocker)
New customers can't sign up independently.
- Need registration flow
- Need organisation creation wizard
- Need initial data import guidance
- Need trial period management

**Effort:** ~1 week

#### GAP-04: No Audit Logging (Enterprise Requirement)
- No record of data access
- No record of configuration changes
- No record of AI generation events
- Critical for SOC 2 and GDPR compliance

**Effort:** ~3-5 days

#### GAP-05: No Monitoring or Error Tracking
- No Sentry/Bugsnag for error tracking
- No uptime monitoring
- No alerting on Edge Function failures
- No Anthropic API cost monitoring

**Effort:** ~1-2 days

#### GAP-06: No GDPR Compliance Infrastructure
- No privacy policy
- No terms of service
- No data export capability (right to portability)
- No account deletion workflow (right to erasure)
- No cookie consent (if analytics added later)
- No Data Processing Agreement template

**Effort:** ~3-5 days (technical) + legal review

#### GAP-07: No Backup/DR Documentation
- Relies entirely on Supabase managed backups
- No documented disaster recovery procedure
- No tested restore process
- No business continuity plan

**Effort:** ~1-2 days to document and test

#### GAP-08: No Test Coverage
- Test infrastructure exists (Vitest configured) but no meaningful test files found
- No integration tests
- No E2E tests
- Enterprise customers may require evidence of testing

**Effort:** ~2-3 weeks for meaningful coverage

---

## Part 4: Prioritised Action Plan

### Phase A: Critical Security Fixes (Do This Week)

| # | Action | Severity | Effort |
|---|--------|----------|--------|
| 1 | Add JWT auth to all 3 AI Edge Functions | CRITICAL | 2 hours |
| 2 | Replace CORS `*` with actual domain on all Edge Functions | HIGH | 1 hour |
| 3 | Add security headers to `vercel.json` | HIGH | 30 mins |
| 4 | Remove console.log from auth-context.tsx | MEDIUM | 10 mins |
| 5 | Strip console.* from production builds | MEDIUM | 15 mins |
| 6 | Disable source maps in production | LOW | 5 mins |
| 7 | Remove ReactQueryDevtools from production | MEDIUM | 15 mins |

**Total: ~4 hours of work to close the most dangerous holes.**

### Phase B: Database Hardening (This Week or Next)

| # | Action | Severity | Effort |
|---|--------|----------|--------|
| 1 | Fix consultant data leakage - create database view that strips financial columns for consultant role | CRITICAL | 4 hours |
| 2 | Convert SECURITY DEFINER views to SECURITY INVOKER | HIGH | 2 hours |
| 3 | Add `SET search_path = public` to all functions | MEDIUM | 1 hour |
| 4 | Increase password minimum to 8 chars + enable leaked password protection | MEDIUM | 30 mins |
| 5 | Sanitise error messages in Edge Functions | MEDIUM | 1 hour |

### Phase C: Enterprise Foundation (Before First Sale)

| # | Action | Effort |
|---|--------|--------|
| 1 | Add Sentry error tracking | 1 day |
| 2 | Add uptime monitoring (BetterUptime/Checkly) | 2 hours |
| 3 | Implement basic audit logging | 3-5 days |
| 4 | Add rate limiting to Edge Functions | 1-2 days |
| 5 | Create privacy policy + terms of service | 2-3 days + legal |
| 6 | Verify Supabase region (must be EU) | 1 hour |
| 7 | Document DR/backup procedures | 1 day |

### Phase D: Multi-Tenant SaaS (Before Selling to Other Firms)

| # | Action | Effort |
|---|--------|--------|
| 1 | Add organisation_id to schema + RLS | 2 weeks |
| 2 | Stripe billing integration | 1 week |
| 3 | Self-service onboarding flow | 1 week |
| 4 | Per-org branding/configuration | 3-5 days |
| 5 | GDPR compliance (export, deletion) | 3-5 days |
| 6 | Meaningful test coverage | 2-3 weeks |

---

## Conclusion

**For Chester as a single-client deployment (current use):**
- Fix Phase A and Phase B items. This makes it production-safe for Chester's 20 businesses.
- Vercel + Supabase Pro is the right stack. No need to migrate.
- Total effort: ~1-2 days.

**For selling as a SaaS product:**
- Need all four phases (A through D).
- Total effort: ~6-8 weeks of focused development.
- Vercel remains appropriate for the frontend.
- Supabase remains appropriate for the backend (consider Enterprise plan for large clients).
- The architecture is sound - it's the security hardening and multi-tenancy that need work, not a platform migration.

**Bottom line:** The platform choices (Vercel + Supabase) are fine. The code architecture is solid. The gaps are all fixable. Prioritise Phase A this week - it's 4 hours of work that closes your biggest security risks.

---

## Appendix: Greptile AI Audit Cross-Check (2026-02-10)

Greptile was indexed and queried as a supplementary audit tool. **Important finding:** When asked whether `generate-analysis` has auth checks, Greptile **hallucinated auth code that does not exist** in the actual file. It fabricated an `Authorization` header check and `getUser()` call that are not present in the source code.

This was verified by:
1. Direct grep: `authHeader|Authorization|getUser` returns **zero matches** in `generate-analysis/index.ts`
2. Direct file read: Lines 393-403 show the handler goes from `req.json()` directly to `SUPABASE_SERVICE_ROLE_KEY` with no auth checks

**Lesson:** AI code analysis tools should supplement, not replace, direct code review for security audits.
