# Project State: Chester Business Scorecard

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** Companies see ONLY their own data; Chester admins see aggregated insights.
**Current focus:** Phase 7 - Reminders COMPLETE (2/2 plans)

## Current Status

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 1 | Branding | Complete | 100% |
| 2 | Authentication | Complete | 100% |
| 3 | Unified Form | Complete | 100% (2/2 plans) |
| 4 | Data Import | Complete | 100% (2/2 plans) |
| 5 | Reporting | Complete | 100% (2/2 plans) |
| 6 | Action Tracking | Complete | 100% (2/2 plans) |
| 7 | Reminders | Complete | 100% (2/2 plans) |

**Overall Progress:** [========================================] 100% (15/15 plans)

## Milestone

**Target:** Feb 7, 2026 (Friday meeting)
**Days remaining:** 5

## Recent Activity

| Date | Action |
|------|--------|
| 2026-02-02 | Completed 07-02-PLAN.md (Submission status UI) |
| 2026-02-02 | Completed Phase 7: Reminders (2 plans) |
| 2026-02-02 | Completed 07-01-PLAN.md (Reminder email infrastructure) |
| 2026-02-02 | Completed 06-02-PLAN.md (Action UI components) |
| 2026-02-02 | Completed 06-01-PLAN.md (Action tracking foundation) |
| 2026-02-02 | Completed Phase 5: Reporting (2 plans) - Human verification needed |
| 2026-02-02 | Completed 05-02-PLAN.md (Portfolio month filter & meeting prep) |
| 2026-02-02 | Completed 05-01-PLAN.md (Business scorecard display) |
| 2026-02-02 | Completed Phase 4: Data Import (2 plans) |
| 2026-02-02 | Completed 04-02-PLAN.md (Import UI Components) |
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
| 04-02 | Upsert with onConflict data_request_id | Allows re-running import to update existing months |
| 04-02 | submitted_by_name = 'Historical Import' | Clear audit trail for imported vs submitted data |
| 05-01 | Separate view route from edit route | /view/:scorecardId for read-only, /scorecard/:scorecardId for edit |
| 05-01 | Section scores grid with color-coding | Quick visual health assessment for meetings |
| 05-02 | Meeting summary uses aggregatePortfolio for anonymization | Reuses existing pattern from portfolio analysis for consistency |
| 05-02 | Month filter applies to both cards and heatmap views | Consistent filtering across visualization types |
| 06-01 | Simple status model (pending/complete) | Complex workflows deferred to v2 if needed |
| 06-01 | Single owner per action | Research shows higher completion rates with single ownership |
| 06-01 | Business user SELECT only for actions | Admins manage action CRUD during meetings |
| 06-02 | Default due date 7 days from creation | Convenience default for Friday meetings |
| 06-02 | Badge hides when count is 0 | No visual clutter when no pending actions |
| 06-02 | Overdue items red, today amber | Visual urgency indicators |
| 07-01 | Resend for email delivery | Developer-friendly API, reliable delivery, domain verification built-in |
| 07-01 | Daily 9am UTC reminders | Aligns with business hours, not too aggressive |
| 07-01 | Manual pg_cron setup | Requires Vault secrets to be configured first |
| 07-01 | Current month only | Keep reminders focused on recent data |
| 07-02 | Two-column submitted/pending layout | Clear visual separation, color-coded badges for quick status |
| 07-02 | Send button in card header | Always visible, disabled when no pending businesses |
| 07-02 | Month filter integration | Consistent filtering across all dashboard elements |

## Blockers

| Blocker | Impact | Workaround |
|---------|--------|------------|
| Edge Function deployment requires Supabase credentials | Meeting Prep and Reminders will fail until deployed | Manual deployment needed with project access |
| Migrations need deployment | Actions and reminders won't work until deployed | Run `supabase db push` with project access |
| Resend domain verification | Reminder emails won't deliver until domain verified | Verify velocitygrowth.co.uk in Resend Dashboard |
| RESEND_API_KEY not set | Reminder Edge Function will fail | Set in Supabase Dashboard → Edge Functions → send-reminders → Secrets |

## Session Continuity

**Last session:** 2026-02-02
**Stopped at:** Completed 07-02-PLAN.md
**Resume file:** None

## Next Action

**PROJECT COMPLETE!** All 7 phases finished. 15/15 plans executed.

**Completed in 07-02:**
- useSubmissionStatus React Query hook
- SubmissionStatusPanel component with submitted/pending lists
- Manual "Send Reminders" button on portfolio dashboard
- Integration with month filter for dynamic status updates

**Completed in 07-01:**
- send-reminders Edge Function with Resend API integration
- get_pending_submissions database function (SECURITY DEFINER)
- pg_cron setup instructions for daily automation
- Professional HTML email template with Chester branding

**Ready for Deployment:**
1. Deploy migrations: `supabase db push`
2. Deploy Edge Functions: `npx supabase functions deploy send-reminders`
3. Set RESEND_API_KEY in Supabase Dashboard
4. Verify velocitygrowth.co.uk domain in Resend Dashboard
5. (Optional) Setup pg_cron for daily 9am reminders

**Pre-Meeting Checklist (Feb 7):**
- [ ] All migrations deployed
- [ ] All Edge Functions deployed
- [ ] Test data imported for multiple businesses
- [ ] Test scorecard generation
- [ ] Test meeting summary generation
- [ ] Test action tracking
- [ ] Test reminder emails (manual trigger)

---
*State updated: 2026-02-02*
