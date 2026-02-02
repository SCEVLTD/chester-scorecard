# Project State: Chester Business Scorecard

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** Companies see ONLY their own data; Chester admins see aggregated insights.
**Current focus:** Phase 4 Plan 1 Complete - Excel Parser Core

## Current Status

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 1 | Branding | Complete | 100% |
| 2 | Authentication | Complete | 100% |
| 3 | Unified Form | Complete | 100% (2/2 plans) |
| 4 | Data Import | In Progress | 33% (1/3 plans) |
| 5 | Reporting | Pending | 0% |
| 6 | Action Tracking | Pending | 0% |
| 7 | Reminders | Pending | 0% |

**Overall Progress:** [================........................] 47% (8/17 plans)

## Milestone

**Target:** Feb 7, 2026 (Friday meeting)
**Days remaining:** 5

## Recent Activity

| Date | Action |
|------|--------|
| 2026-02-02 | Completed 04-01-PLAN.md (Excel parser core) |
| 2026-02-02 | Completed 03-02-PLAN.md (Unified form page + hooks) |
| 2026-02-02 | Completed 03-01-PLAN.md (Unified form schema + types) |
| 2026-02-02 | Completed Phase 2: Authentication (3 plans) |
| 2026-02-02 | Completed 02-03-PLAN.md (Route protection + RLS) |
| 2026-02-02 | Completed 02-02-PLAN.md (React auth infrastructure) |
| 2026-02-02 | Completed 02-01-PLAN.md (Database auth schema) |
| 2026-02-02 | Completed Phase 1: Branding (2 plans) |
| 2026-02-02 | Project initialized |

## Accumulated Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 01-01 | Logo as separate TS module | 85KB base64 too large for inline embedding |
| 01-01 | Strapline in PDF header | "Doing good by doing well" adds brand identity |
| 01-02 | Logo-only on admin pages | Strapline optional for internal pages - keeps UI cleaner |
| 01-02 | Group name on company-facing pages only | BRAND-03 requirement - network identification for external users |
| 02-01 | Helper functions in public schema | auth schema requires elevated permissions |
| 02-01 | JWT claim decoding in AuthContext | Custom claims from hook go to JWT payload, not app_metadata |
| 02-03 | RLS policies use public.is_admin() | Consistent with public schema helper functions |
| 03-01 | Qualitative fields required in unified form | Companies must self-assess - not optional like old consultant flow |
| 03-02 | Route path /company/:businessId/submit | Distinguishes company-facing routes from admin /business/ routes |
| 04-01 | Use Zod v4 .issues for error handling | Zod v4 changed error structure from .errors to .issues |
| 04-01 | All financial fields optional in import schema | Historical data may be incomplete (sales from 2021, EBITDA from 2025) |

## Blockers

None currently.

## Session Continuity

**Last session:** 2026-02-02
**Stopped at:** Completed 04-01-PLAN.md
**Resume file:** None

## Next Action

Proceed to Phase 4 Plan 2 (Import UI Components).

Key deliverables from Phase 4 Plan 1:
- Excel parser with SheetJS for browser-based file reading
- Column alias mapping (26 variations to 13 fields)
- Business name matching with suffix normalization
- Date format normalization (Date objects, strings, Excel serial)
- Validation pipeline producing ParseResult with valid/invalid rows

---
*State updated: 2026-02-02*
