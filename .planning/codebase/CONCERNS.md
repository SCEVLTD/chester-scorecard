# Codebase Concerns

**Analysis Date:** 2026-02-02

## Tech Debt

**Excessive Type Assertions:**
- Issue: Supabase query results are cast with `as Type` throughout hooks instead of using proper type inference
- Files: `src/hooks/use-scorecards.ts`, `src/hooks/use-businesses.ts`, `src/hooks/use-sectors.ts`, `src/hooks/use-data-requests.ts`, `src/hooks/use-company-submissions.ts`, `src/hooks/use-comparison-data.ts`, `src/hooks/use-portfolio-summary.ts`
- Impact: Type safety is bypassed; runtime errors possible if database schema changes
- Fix approach: Use Supabase's typed client properly with Database generics; let TypeScript infer types from `.select()` calls

**AI Analysis Type Coercion:**
- Issue: `ai_analysis` field cast with `as unknown as AIAnalysis` pattern
- Files: `src/lib/pdf-data-mapper.ts:161`, `src/components/ai-analysis-panel.tsx:103`
- Impact: JSON stored in database may not match expected shape; no runtime validation
- Fix approach: Use Zod validation (already have schema) at retrieval time; return undefined for invalid data

**Legacy Route Present:**
- Issue: Old route pattern `/scorecard/:businessId` left in codebase with comment "can be removed after migration"
- Files: `src/App.tsx:31`
- Impact: Confusing codebase; potential for bugs if both routes are used
- Fix approach: Remove legacy route; verify no external links point to it

**Console Logging in Production Code:**
- Issue: 20+ console.log/warn/error calls scattered throughout codebase
- Files: `src/lib/validation-helpers.ts` (7 instances), `src/pages/home.tsx`, `src/pages/scorecard.tsx`, `src/hooks/use-pdf-export.ts`, `src/hooks/use-excel-export.ts`, `src/components/request-data-modal.tsx`, `src/schemas/ai-analysis.ts`, `src/schemas/portfolio-analysis.ts`
- Impact: Noisy console in production; potential information leakage
- Fix approach: Replace with proper logging service or remove; keep only critical error.log for debugging

**Pending Database Migration:**
- Issue: Migration file exists but may not be applied; adds `outbound_calls` and `first_orders` columns
- Files: `supabase/migrations/20260201_add_lead_kpis.sql`
- Impact: TypeScript types in `src/types/database.types.ts` don't include these columns; potential mismatch
- Fix approach: Apply migration and regenerate types; or remove migration if feature not needed

## Security Considerations

**No Authentication - CRITICAL:**
- Risk: All RLS policies set to `USING (true)` - any user can read/write any data
- Files: `supabase/migrations/00000000_full_schema.sql:130-135`, `supabase/migrations/20260127_add_data_requests.sql:21-27`
- Current mitigation: None - comments say "permissive for now - no auth"
- Recommendations:
  1. Implement Supabase Auth before production use
  2. Add RLS policies based on user/business ownership
  3. Restrict consultant-only routes (home, portfolio, business pages)
  4. Keep company submission routes public but token-validated

**Magic Link Tokens Exposed in URL:**
- Risk: Tokens visible in browser history, logs, referrer headers
- Files: `src/pages/company-submit.tsx`, `src/lib/magic-link.ts`
- Current mitigation: 64-char random tokens, 7-day expiry
- Recommendations: Consider POST-based token validation; add rate limiting; log token access attempts

**Public Supabase Key in Environment:**
- Risk: Publishable key exposed client-side (expected, but compounded by no RLS)
- Files: `src/lib/supabase.ts:4-5`
- Current mitigation: None meaningful without RLS
- Recommendations: Fix RLS policies first; key exposure is acceptable with proper RLS

**No Input Sanitization for AI Prompts:**
- Risk: User-submitted commentary sent directly to Claude API
- Files: `supabase/functions/generate-analysis/index.ts:56-135`
- Current mitigation: None
- Recommendations: Sanitize text fields before prompt construction; limit field lengths

## Performance Bottlenecks

**N+1 Query Pattern in Submissions:**
- Problem: `useSubmissionByToken` makes 2 sequential queries (token lookup + submission)
- Files: `src/hooks/use-company-submissions.ts:94-113`
- Cause: No join query; separate lookups for data_request and company_submission
- Improvement path: Use Supabase join syntax: `.select('*, data_requests!inner(*)')` with filter

**Portfolio Aggregation Client-Side:**
- Problem: All scorecards fetched to client for aggregation
- Files: `src/lib/portfolio-aggregator.ts`, `src/hooks/use-portfolio-summary.ts`
- Cause: Complex grouping logic done in JavaScript
- Improvement path: Move aggregation to Supabase database function; return only summary data

**Full Chart Data Loaded:**
- Problem: All historical scorecards loaded for charts even with time filter
- Files: `src/hooks/use-chart-data.ts:63-85`
- Cause: Filtering applied after fetch
- Improvement path: Add date filter to Supabase query; fetch only needed months

## Fragile Areas

**Scorecard Form State Management:**
- Files: `src/pages/scorecard.tsx` (402 lines), `src/pages/company-submit.tsx` (577 lines)
- Why fragile: Complex useEffect chains for form sync; multiple data sources (URL params, existing scorecard, company submission)
- Safe modification: Add comprehensive tests for form state; extract into custom hooks
- Test coverage: No tests for form behavior

**Scoring Calculation Duplication:**
- Files: `src/lib/scoring.ts`, `src/lib/pdf-data-mapper.ts`, `src/lib/chart-utils.ts`
- Why fragile: Same scoring logic exists in 3 places; changes must be synchronized
- Safe modification: Use only `scoring.ts` functions; refactor others to import from there
- Test coverage: `scoring.test.ts` covers `scoring.ts` well (374 lines)

**Validation Helpers with Silent Failures:**
- Files: `src/lib/validation-helpers.ts`
- Why fragile: Invalid enum values silently return `undefined` with only console.warn
- Safe modification: Consider throwing in development; track in monitoring
- Test coverage: No tests

## Scaling Limits

**All Scorecards Loaded for Latest Scores:**
- Current capacity: Scales linearly with scorecard count
- Limit: Will slow significantly with 1000+ scorecards across all businesses
- Scaling path: Add database view for `latest_scorecard_per_business`; or use `DISTINCT ON` query

**AI Analysis Generation:**
- Current capacity: One Claude API call per scorecard (~5-15 seconds)
- Limit: No rate limiting; concurrent requests could hit Anthropic limits
- Scaling path: Queue analysis requests; add retry with backoff

## Test Coverage Gaps

**No Component Tests:**
- What's not tested: All React components, form interactions, error states
- Files: All files in `src/components/`, `src/pages/`
- Risk: UI regressions undetected; form validation bugs possible
- Priority: High - forms handle financial data

**No Hook Tests:**
- What's not tested: All TanStack Query hooks, Supabase interactions
- Files: All files in `src/hooks/`
- Risk: Data fetching/mutation bugs; cache invalidation issues
- Priority: Medium - mostly straightforward CRUD

**No Integration Tests:**
- What's not tested: Full user flows (create scorecard, submit data, view analysis)
- Risk: Workflow bugs undetected; cross-component issues
- Priority: Medium

**Only Scoring Logic Tested:**
- What's tested: `src/lib/scoring.ts` has 374 lines of tests (excellent coverage)
- Files: `src/lib/scoring.test.ts`
- Note: This is the most critical business logic - good that it's tested

## Missing Critical Features

**No Error Reporting Service:**
- Problem: Errors only logged to console; no visibility into production issues
- Blocks: Cannot diagnose user-reported problems; no proactive alerting
- Priority: High before production use

**No User Authentication:**
- Problem: Anyone with URL can access any data
- Blocks: Multi-tenant use; client confidentiality; audit trail
- Priority: Critical before production use

**No Data Backup Strategy:**
- Problem: Relying on Supabase automatic backups; no tested restore procedure
- Blocks: Disaster recovery; compliance requirements
- Priority: Medium

## Dependencies at Risk

**Zod v4 Recently Released:**
- Risk: Using `zod@^4.3.6` - major version with potential breaking changes
- Impact: Schema validation could behave differently from v3 examples/docs
- Migration plan: Monitor for issues; zod v4 appears stable but relatively new

**React 19 Adoption:**
- Risk: Using `react@^19.2.0` - relatively new major version
- Impact: Some libraries may have compatibility issues
- Migration plan: Already have `react-is` override in package.json for compatibility

---

*Concerns audit: 2026-02-02*
