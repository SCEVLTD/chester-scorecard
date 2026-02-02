# Roadmap: Chester Business Scorecard

**Created:** 2026-02-02
**Deadline:** Feb 7, 2026 (Friday meeting)
**Phases:** 7

## Overview

| # | Phase | Goal | Requirements | Priority |
|---|-------|------|--------------|----------|
| 1 | Branding | Chester/Velocity visual identity | BRAND-01, BRAND-02, BRAND-03 | CRITICAL - Demo ready |
| 2 | Authentication | Secure access with role separation | AUTH-01 to AUTH-05 | CRITICAL - Required |
| 3 | Unified Form | Companies submit all data in one form | FORM-01 to FORM-07 | CRITICAL - Core feature |
| 4 | Data Import | Historical data available for demo | DATA-01 to DATA-04 | HIGH - Demo data |
| 5 | Reporting | Scorecards and aggregated insights | REPORT-01 to REPORT-06 | HIGH - Shows value |
| 6 | Action Tracking | Capture meeting outcomes | ACTION-01 to ACTION-03 | MEDIUM - Post-meeting |
| 7 | Reminders | Automated data collection prompts | REMIND-01 to REMIND-03 | MEDIUM - Post-launch |

## Phase Details

### Phase 1: Branding
**Goal:** Transform UBT visual identity to Chester/Velocity for credibility at Friday demo.

**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md - Core branding: extract logo, update PDF and charts
- [x] 01-02-PLAN.md - Page headers: add branding to all user-facing pages

**Requirements:**
- BRAND-01: Velocity logo on all pages
- BRAND-02: Strapline from PowerPoint ("Doing good by doing well")
- BRAND-03: Chester Brethren Business Group naming

**Success Criteria:**
1. Landing page shows Velocity logo and strapline
2. Company submission form shows Chester branding
3. All page titles reference Chester, not UBT
4. PDF export includes Chester/Velocity header

**Notes:** Quick win. Use assets from PowerPoint shared in meeting.

---

### Phase 2: Authentication
**Goal:** Businesses log in and see only their own data; Chester admins see everything.

**Plans:** 3 plans

Plans:
- [x] 02-01-PLAN.md - Database schema: profiles table, auth hook, helper functions
- [x] 02-02-PLAN.md - React auth: AuthContext, login form, login page
- [x] 02-03-PLAN.md - Route protection and RLS policies

**Requirements:**
- AUTH-01: Business can log in with email/password
- AUTH-02: Multiple users from same business see same data
- AUTH-03: Chester admin role views all businesses
- AUTH-04: Business user restricted to own data
- AUTH-05: Session persists across refresh

**Success Criteria:**
1. Business user logs in → sees only their company's scorecards
2. Chester admin logs in → sees portfolio of all 19 businesses
3. Unauthorized access to other businesses returns 403
4. Session survives browser refresh and tab close/reopen
5. Logout clears session completely

**Notes:** Supabase Auth with RLS policies. Row Level Security is key for data isolation.

---

### Phase 3: Unified Form
**Goal:** Single form where companies enter financials + qualitative scoring + commentary.

**Plans:** 2 plans

Plans:
- [x] 03-01-PLAN.md - Database schema + types: qualitative columns, Lead KPI types, unified schema
- [x] 03-02-PLAN.md - Unified form page: /company/:businessId/submit route with all sections

**Requirements:**
- FORM-01: Single form combining financials + qualitative sections
- FORM-02: Financial fields: Revenue, GP, Overheads, EBITDA
- FORM-03: Lead KPI fields: Outbound calls, First orders
- FORM-04: Qualitative scoring: Leadership, Market, Product, Suppliers, Sales
- FORM-05: Commentary: Wins, Challenges, Opportunity, Risk
- FORM-06: Month selector visible
- FORM-07: EBITDA auto-calculates with manual override

**Success Criteria:**
1. Company user opens form → sees all sections in one page
2. Financial fields validate (positive numbers, reasonable ranges)
3. Qualitative dropdowns show all options with clear labels
4. Submitting form creates/updates scorecard record
5. Score calculated automatically from inputs
6. Form completable in under 10 minutes

**Notes:** Merge existing company-submit.tsx and scorecard.tsx patterns. Keep it simple.

---

### Phase 4: Data Import
**Goal:** Import Shane's historical Excel data so demo shows real trends.

**Plans:** 2 plans

Plans:
- [x] 04-01-PLAN.md - Excel parser core: SheetJS integration, column mapping, validation
- [x] 04-02-PLAN.md - Import UI + hook: dropzone, preview, bulk upsert, admin page

**Requirements:**
- DATA-01: Import historical sales (from Jan 2021)
- DATA-02: Import historical EBITDA (from Jan 2025)
- DATA-03: Import 2026 annual targets
- DATA-04: Self-service upload for Chester admins

**Success Criteria:**
1. Historical data visible in scorecard history for each business
2. Charts show multi-year trends where data exists
3. 2026 targets pre-populated for monthly comparisons
4. Admin can upload CSV/Excel without developer intervention
5. Import validates data format and reports errors clearly

**Notes:** Shane has Excel files ready. Create import tool that maps columns to database fields.

---

### Phase 5: Reporting
**Goal:** Individual scorecards + aggregated portfolio view ready for Friday meeting.

**Plans:** 2 plans

Plans:
- [x] 05-01-PLAN.md - Individual scorecard display: prominent score, AI insights, PDF export
- [x] 05-02-PLAN.md - Portfolio reporting: month filter, meeting prep summary

**Requirements:**
- REPORT-01: Individual scorecard with 0-100 score and RAG
- REPORT-02: AI-generated insights per business
- REPORT-03: Aggregated portfolio summary (anonymized)
- REPORT-04: Meeting prep AI summary
- REPORT-05: PDF export per business
- REPORT-06: Heat map by month

**Success Criteria:**
1. Scorecard displays score prominently with color coding
2. AI analysis generates within 10 seconds
3. Portfolio view shows all 19 businesses without revealing individual data
4. Meeting summary highlights common themes, not individual businesses
5. PDF exports cleanly with Chester branding
6. Heat map allows month selection and shows score trends

**Notes:** Existing AI generation works. Focus on aggregation that protects confidentiality.

---

### Phase 6: Action Tracking
**Goal:** Capture outcomes from Friday meeting against specific businesses.

**Plans:** 2 plans

Plans:
- [ ] 06-01-PLAN.md - Database schema, types, and hooks for actions CRUD
- [ ] 06-02-PLAN.md - UI components: modal form, pending list, dashboard badge

**Requirements:**
- ACTION-01: Capture actions against businesses
- ACTION-02: Display pending actions on dashboard
- ACTION-03: Mark actions complete

**Success Criteria:**
1. Admin can add action with description, owner, due date
2. Action linked to specific business
3. Dashboard shows pending action count
4. Business view shows their pending actions
5. Completing action removes from pending list

**Notes:** Simple CRUD. Can be basic for v1, enhance later.

---

### Phase 7: Reminders
**Goal:** Automated prompts to submit monthly data.

**Requirements:**
- REMIND-01: Email reminders for data submission
- REMIND-02: Track submission status per business per month
- REMIND-03: Configurable reminder frequency

**Success Criteria:**
1. System sends email reminder on configured schedule
2. Email stops once business submits for that month
3. Admin dashboard shows who has/hasn't submitted
4. Reminder frequency adjustable (daily, every 2 days, etc.)
5. Email includes direct link to submission form

**Notes:** Use Supabase Edge Functions or external email service. Can be scheduled via cron.

---

## Dependency Graph

```
Phase 1 (Branding) ─────────────────────────────────────────┐
                                                            │
Phase 2 (Auth) ─────────┬───────────────────────────────────┼──► Phase 5 (Reporting)
                        │                                   │
                        ├──► Phase 3 (Unified Form) ────────┤
                        │                                   │
                        ├──► Phase 4 (Data Import) ─────────┘
                        │
                        ├──► Phase 6 (Action Tracking)
                        │
                        └──► Phase 7 (Reminders)
```

**Critical Path for Friday:** Phases 1, 2, 3, 5 (Branding → Auth → Form → Reporting)

---

## Friday Meeting MVP

Minimum viable for demo:
- [x] Chester/Velocity branding
- [x] Business login working
- [x] Unified form for data submission
- [x] Basic scorecard display with AI insights

Nice to have:
- Historical data imported (shows trends)
- Heat map working
- PDF export

Can ship after Friday:
- Action tracking (use during meeting, refine after)
- Automated reminders (start manual, automate later)

---

*Roadmap created: 2026-02-02*
*Last updated: 2026-02-02 — Phase 6 planned (Action Tracking)*
