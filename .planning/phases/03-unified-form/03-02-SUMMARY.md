---
phase: 03
plan: 02
type: execute
subsystem: frontend-form
tags: [react, tanstack-query, form, authentication]
dependency-graph:
  requires: [03-01]
  provides: [unified-submission-page, authenticated-form-flow]
  affects: [04-data-import, 05-reporting]
tech-stack:
  added: []
  patterns: [react-hook-form, zod-resolver, tanstack-query-mutations]
key-files:
  created:
    - src/hooks/use-unified-submission.ts
    - src/pages/unified-submit.tsx
  modified:
    - src/App.tsx
    - src/components/auth/protected-route.tsx
    - src/contexts/auth-context.tsx
decisions:
  - id: "03-02-001"
    decision: "Unified form uses /company/:businessId/submit route"
    rationale: "Consistent with existing /business/:businessId pattern but distinct for company-facing submissions"
metrics:
  duration: "~10 minutes"
  completed: "2026-02-02"
---

# Phase 3 Plan 2: Unified Form Page Summary

**One-liner:** Authenticated monthly submission form with financials, lead KPIs, qualitative scoring, and commentary.

## What Was Built

### Unified Submission Hook (`src/hooks/use-unified-submission.ts`)
Two exports:
- `useCreateUnifiedSubmission()` - Mutation to create/upsert submission
  - Creates data_request if none exists for business+month
  - Upserts to company_submissions with all fields
  - Calculates total score using scoring.ts functions
  - Returns submission result and calculated score
- `useUnifiedSubmission(businessId, month)` - Query for existing submission
  - Used to populate form when editing previous submission
  - Handles PGRST116 (no rows) gracefully

### Unified Submit Page (`src/pages/unified-submit.tsx`)
Single-page form with 5 sections:
1. **Month Selector** - Last 12 months dropdown
2. **Financial Performance (40 pts)** - Revenue, GP, Overheads, EBITDA with auto-calculation
3. **Lead KPIs** - Outbound calls and first orders (optional)
4. **Business Self-Assessment (60 pts)** - 6 qualitative radio groups with point display
5. **Business Commentary** - 4 textareas for wins, challenges, opportunities, risks

Features:
- EBITDA auto-calculates (GP - Overheads) with manual override option
- Productivity actual displays calculated GP/Wages ratio
- Loads existing submission for editing when month changes
- Success toast shows calculated score
- Redirects to business history on submit

### Route Registration (`src/App.tsx`)
- Added `/company/:businessId/submit` protected route
- Uses `ProtectedRoute` with `allowedBusinessId` check
- Only business owner or admin can access

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 6ebc39e | feat | Create unified submission hook |
| bfe717e | feat | Create unified submission page |
| fe71197 | feat | Add unified submission route |
| 509a379 | fix | Fix TypeScript build errors |

## Key Files

```
src/hooks/use-unified-submission.ts   # Mutation and query hooks (177 lines)
src/pages/unified-submit.tsx          # Form page component (870 lines)
src/App.tsx                           # Route registration (+8 lines)
```

## Decisions Made

1. **Route path `/company/:businessId/submit`** - Chose `/company/` prefix to distinguish company-facing routes from admin `/business/` routes, though both use ProtectedRoute.

2. **useBusinesses for business lookup** - Reused existing hook rather than creating new query, keeping data fetching patterns consistent.

3. **Score calculation in mutation** - Calculate and return score during submission rather than separate call, so users see immediate feedback.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TypeScript build errors**
- **Found during:** Task verification (npm run build)
- **Issue:** `verbatimModuleSyntax` requires type-only imports for ReactNode
- **Fix:** Changed `import { ReactNode }` to `import type { ReactNode }` in protected-route.tsx and auth-context.tsx
- **Files modified:** src/components/auth/protected-route.tsx, src/contexts/auth-context.tsx
- **Commit:** 509a379

**2. [Rule 1 - Bug] Fixed DataRequest type inference**
- **Found during:** Task 1 implementation
- **Issue:** Supabase insert().select().single() returns generic type without proper inference
- **Fix:** Added explicit type cast `(newRequest as DataRequest).id`
- **Files modified:** src/hooks/use-unified-submission.ts
- **Commit:** 509a379

**3. [Rule 1 - Bug] Removed unused variable**
- **Found during:** Build verification
- **Issue:** `userRole` declared but not used in unified-submit.tsx
- **Fix:** Removed unused destructured variable from useAuth()
- **Files modified:** src/pages/unified-submit.tsx
- **Commit:** 509a379

## Test Evidence

- TypeScript compilation: PASS (`npx tsc --noEmit`)
- Production build: PASS (`npm run build`)
- Hook exports: `useCreateUnifiedSubmission`, `useUnifiedSubmission`
- Page exports: `UnifiedSubmitPage`
- Route registered: `/company/:businessId/submit`
- All 6 qualitative radio groups present with point display
- EBITDA auto-calculation with override option

## Integration Points

### Form Validation
Uses `zodResolver(unifiedSubmissionSchema)` from Plan 1:
- All financial fields validated as positive numbers
- Month validated as YYYY-MM format
- Qualitative fields required (6 radio groups)
- Commentary fields optional

### Scoring Integration
Imports from `src/lib/scoring.ts`:
- `LEADERSHIP_OPTIONS`, `MARKET_DEMAND_OPTIONS`, `MARKETING_OPTIONS`
- `PRODUCT_OPTIONS`, `SUPPLIER_OPTIONS`, `SALES_OPTIONS`
- `calculateTotalScore` for score calculation in mutation

### Auth Integration
Uses `useAuth()` from auth-context:
- Gets `businessId` from JWT claims as fallback
- Route protected by `ProtectedRoute` with `allowedBusinessId`

## Next Phase Readiness

Phase 3 Unified Form is now complete:
- Plan 1 provided schema and types
- Plan 2 provides submission page and hooks

Ready for Phase 4 (Data Import):
- company_submissions table accepts all form fields
- Existing data can be edited via month selection
- Score calculation ready for reporting in Phase 5

---
*Summary generated: 2026-02-02*
