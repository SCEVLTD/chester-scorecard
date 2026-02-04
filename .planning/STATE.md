# Project State: Chester Business Scorecard

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-03)

**Core value:** Companies see ONLY their own data; three-tier access (Super Admin / Consultant / Business).
**Current focus:** v1.2 Meeting Persistence — searchable meeting history with AI notes

## Current Position

Phase: 11 (Meeting Persistence) of 11
Plan: 1 of 1 complete
Status: Phase complete
Last activity: 2026-02-04 — Completed meeting persistence feature

Progress: ██████████████████████████ 120% (24/20 plans complete)

## Current Status

| Milestone | Phases | Plans | Status |
|-----------|--------|-------|--------|
| v1.0 MVP | 1-7 | 15/15 | SHIPPED |
| v1.1 Friday Launch | 8-10 | 8/8 | COMPLETE |
| v1.2 Meeting Persistence | 11 | 1/1 | COMPLETE |

## Milestone History

See: .planning/MILESTONES.md

- **v1.0 MVP** — Shipped 2026-02-03 (7 phases, 15 plans)
- **v1.1 Friday Launch** — Complete 2026-02-03 (3 phases, 8 plans)
- **v1.2 Meeting Persistence** — Complete 2026-02-04 (1 phase, 1 plan)

## v1.2 Meeting Persistence (Complete)

1. ✓ Database schema — meetings table with full-text search
2. ✓ Edge Functions — generate-meeting-summary (persist option), update-meeting
3. ✓ UI hooks — useMeetings, useMeeting, useSaveMeetingNotes, useFinalizeMeeting
4. ✓ Meeting History page — /meetings with search and filters
5. ✓ Meeting Detail page — /meetings/:meetingId with editable notes
6. ✓ Granola-style UX — AI notes + user notes side-by-side, auto-save
7. ✓ Action linking — Create actions from meeting with meeting_id FK

## v1.1 Priority Order (Complete)

**RIGHT NOW (unblocks everything):**
1. ✓ Fix Magic Link — companies can't log in
2. ✓ Company Management — add all 19 companies with emails
3. ✓ Super Admin role — Shane can upload historical data

**WHILE BUSINESSES FILL FORMS:**
4. ✓ Form fix — remove N/A except Leadership
5. ✓ Invitation system — send emails to all businesses
6. ✓ Consultant role — Dylan/Nick see results without financials
7. ✓ Add actions from portfolio level
8. ✓ Print all scorecards
9. ✓ Admin role management — Shane/Scott can assign roles via UI

## Deployment Checklist (Pre-Meeting)

Before Feb 7, 2026 Friday meeting:

- [ ] Deploy migrations: `supabase db push`
- [ ] Deploy Edge Functions: `npx supabase functions deploy`
- [ ] Set RESEND_API_KEY in Supabase Dashboard
- [ ] Verify velocitygrowth.co.uk domain in Resend Dashboard
- [ ] Import historical data for Chester businesses
- [ ] Add all 19 companies from spreadsheet
- [ ] Send invitation emails to all businesses
- [ ] Test scorecard generation with real data
- [ ] Test meeting summary generation

## Blockers

| Blocker | Impact | Resolution |
|---------|--------|------------|
| Magic Link broken | Companies can't log in | RESOLVED (08-01) |
| Company management clunky | Can't add emails after creation | RESOLVED (08-02) |
| Edge Function deployment | Meeting Prep + Reminders fail | Deploy with Supabase credentials |
| RESEND_API_KEY not set | Invitation/reminder emails fail | Set in Supabase Dashboard |

## Decisions

| Decision ID | Phase | What | Chosen | Why |
|------------|-------|------|--------|-----|
| ADMIN-UI-01 | 08-02 | Edit button placement | Icon button in card header | Minimal clutter, clear affordance |
| FORM-UX-01 | 09-01 | N/A option placement | Only on Leadership Alignment | Client feedback: N/A misused on other questions |
| IMPORT-01 | 09-02 | Duplicate handling | Skip duplicates, don't update | Safer for bulk import, prevent accidental overwrites |
| IMPORT-02 | 09-02 | Email setup | Create company_emails with is_primary: true | Automatic setup for invitation sending |
| EMAIL-01 | 09-03 | Invitation expiry | 30 days for invitations, 7 days for reminders | Invitations are onboarding, need more time |
| EMAIL-02 | 09-03 | Email selection | Primary email with fallback to first | Clear priority, automatic fallback |
| ROLE-01 | 10-01 | Role terminology | super_admin and consultant (not admin_full/limited) | Clear semantic meaning, industry standards |
| ROLE-02 | 10-01 | Backward compatibility for old 'admin' JWT | Map 'admin' to 'super_admin' in auth context | Smooth transition, no forced re-login |
| ROLE-03 | 10-01 | Consultant UI permissions | Both super_admin and consultant access admin UI | Consultants need to manage invitations and companies |
| ROLE-04 | 10-01 | Financial data access control | UI filtering now, RLS later | Faster implementation, query-level security is future |
| ACTION-01 | 10-02 | Add Action button visibility | super_admin and consultant only | Friday meeting workflow for Dylan/Nick |
| ACTION-02 | 10-02 | Business dropdown ordering | Alphabetical by name | Quick selection during multi-business meetings |
| BATCH-01 | 10-03 | Concurrent PDF generation approach | Promise.all for parallel generation | Browser handles 6-10 concurrent efficiently, 6-10x faster |
| BATCH-02 | 10-03 | Progress tracking granularity | Update after each PDF completes | Simple, accurate, no performance impact with 19 businesses |
| BATCH-03 | 10-03 | ZIP compression level | DEFLATE level 6 | Good balance for PDFs (already compressed internally) |
| FILTER-01 | 10-04 | SubmittedFinancialsDisplay for consultants | Hide entirely | Simpler than partial data; consultants see score via BusinessScorecardView |
| FILTER-02 | 10-04 | ComparisonColumns financial filtering | Filter metricRows array | Hide Financial section header and all four variance rows |
| ROLE-05 | 10-05 | Role selector default | Default to consultant | Safer default; most new admins will be consultants |
| ROLE-06 | 10-05 | Role editing approach | Inline dropdown in list | Quick access without modal; matches admin list pattern |
| MEETING-01 | 11-01 | Meeting persistence approach | Granola-style (AI + user notes) | Best-in-class UX from competitive research |
| MEETING-02 | 11-01 | Search implementation | PostgreSQL full-text GIN index | Native, fast, no external service needed |
| MEETING-03 | 11-01 | Auto-save mechanism | useDebouncedCallback (500ms) | Responsive UX without overwhelming server |
| MEETING-04 | 11-01 | Meeting workflow | draft → finalized (locks editing) | Clear state machine, prevent accidental changes |
| MEETING-05 | 11-01 | Portfolio snapshot storage | JSONB with aggregated data | Point-in-time reference, no retroactive changes |

## Post-Milestone Fixes (2026-02-04)

| Fix | Issue | Resolution |
|-----|-------|------------|
| AI Model 404 | `claude-sonnet-4-5-20250514` deprecated | Updated to `claude-sonnet-4-5-20250929` in Edge Function |
| AI Analysis not persisting | Missing RLS UPDATE policy for business users | Added `"Business user can update own scorecards"` policy |
| UI Label | "Questions for Next Call" consultant-centric | Renamed to "Focus Points for Next Month" |

**Migrations applied:**
- `20260203_add_business_update_scorecard_policy.sql` - RLS policy for business scorecard updates

**Key technical notes:**
- AI analysis is generated ONCE per scorecard, then saved to `scorecards.ai_analysis` JSONB column
- Business users need UPDATE permission on scorecards for AI analysis save to work
- Claude model versions change; always verify model ID via Anthropic API docs

## Session Continuity

**Last session:** 2026-02-04 22:15 UTC
**Current milestone:** v1.2 Meeting Persistence - COMPLETE
**Stopped at:** AI Analysis persistence fixes complete
**Resume file:** None
**Next action:** Deploy migrations and edge functions to Supabase production if not done.

---
*State updated: 2026-02-04 — AI analysis fixes complete*
