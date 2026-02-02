---
phase: 03
plan: 01
type: execute
subsystem: database-schema
tags: [supabase, typescript, zod, schema]
dependency-graph:
  requires: [02-auth]
  provides: [unified-form-types, qualitative-columns, lead-kpi-types]
  affects: [03-02-unified-form-page, 05-reporting]
tech-stack:
  added: []
  patterns: [zod-validation, database-first-types]
key-files:
  created:
    - supabase/migrations/20260202_add_unified_submission_columns.sql
    - src/schemas/unified-submission.ts
  modified:
    - src/types/database.types.ts
decisions:
  - id: "03-01-001"
    decision: "Qualitative fields required in unified form"
    rationale: "Companies must self-assess - not optional like old consultant flow"
metrics:
  duration: "~5 minutes"
  completed: "2026-02-02"
---

# Phase 3 Plan 1: Unified Form Schema Summary

**One-liner:** Database columns and TypeScript types for unified submission with qualitative self-assessment.

## What Was Built

### Database Migration
Added 6 qualitative scoring columns to `company_submissions` table:
- `leadership` (aligned/minor/misaligned/toxic)
- `market_demand` (strong/flat/softening/decline)
- `marketing` (clear/activity/poor/none)
- `product_strength` (differentiated/adequate/weak/broken)
- `supplier_strength` (strong/acceptable/weak/damaging)
- `sales_execution` (beating/onTarget/underperforming/none)

### TypeScript Types
Updated `CompanySubmission` type with:
- Lead KPI fields: `outbound_calls`, `first_orders` (from existing migration)
- All 6 qualitative scoring fields

### Validation Schema
New `unified-submission.ts` schema validates:
- Month selection (YYYY-MM format)
- Financial data (10 fields)
- Lead KPIs (optional)
- Qualitative scoring (6 required fields)
- Commentary (4 optional fields)

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 2f9d32a | feat | Add qualitative scoring columns to company_submissions |
| 43b003f | feat | Add Lead KPI and qualitative types to CompanySubmission |
| 321c8ed | feat | Create unified submission Zod schema |

## Key Files

```
supabase/migrations/20260202_add_unified_submission_columns.sql  # 6 new columns
src/types/database.types.ts                                       # Updated types
src/schemas/unified-submission.ts                                 # New validation schema
```

## Decisions Made

1. **Qualitative fields required in unified form** - Unlike the old consultant flow where these were optional, companies must self-assess in the unified form. This ensures complete data for scoring.

2. **Lead KPIs optional** - `outboundCalls` and `firstOrders` remain optional since not all businesses track these metrics.

## Deviations from Plan

None - plan executed exactly as written.

## Test Evidence

- TypeScript compilation: PASS (`npx tsc --noEmit`)
- Migration file contains all 6 ALTER TABLE statements
- Types include `outbound_calls` and `leadership` fields
- Schema exports `unifiedSubmissionSchema` and `UnifiedSubmissionData`

## Next Phase Readiness

Ready for 03-02-PLAN.md (Unified Form Page):
- Database accepts all unified form fields
- TypeScript types available for form state
- Zod schema ready for form validation
- Scoring options from `src/lib/scoring.ts` align with schema enums

---
*Summary generated: 2026-02-02*
