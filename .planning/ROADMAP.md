# Roadmap: Chester Business Scorecard v1.2

**Current Milestone:** v1.2 Meeting Persistence
**Previous Milestones:** v1.0 MVP (shipped), v1.1 Friday Launch (complete)
**Phases:** 8-11

## Overview

| Phase | Name | Goal | Requirements | Success Criteria |
|-------|------|------|--------------|------------------|
| 8 | Access & Data Setup | Unblock company login and data upload | AUTH-06, AUTH-07, ADMIN-01, ADMIN-02 | 4 |
| 9 | Invitations & Form | Send emails, businesses can submit | ADMIN-03, ADMIN-04, FORM-08 | 3 |
| 10 | Consultant View & Reporting | Role-based views, portfolio actions | AUTH-08, ACTION-04, REPORT-07 | 3 |
| 11 | Meeting Persistence | Searchable meeting history with AI notes | MEETING-01 | 1 |

**Total:** 4 phases, 11 requirements

---

## Phase 8: Access & Data Setup

**Goal:** Fix blocking issues so companies can log in and Shane can upload historical data.

**Plans:** 3 plans

Plans:
- [x] 08-01-PLAN.md — Fix magic link authentication (Dashboard config + verification)
- [x] 08-02-PLAN.md — Admin company edit UI (edit dialog for portfolio page)
- [x] 08-03-PLAN.md — Multiple emails per company (company_emails table + UI)

**Requirements:**
- AUTH-06: Fix magic link authentication
- AUTH-07: Super Admin role sees all data
- ADMIN-01: Edit company details after creation
- ADMIN-02: Add/edit email addresses for existing companies

**Success Criteria:**
1. User clicks magic link → lands on their company dashboard (not error)
2. Shane (super_admin role) can view any company's full scorecard including financials
3. Admin can click "Edit" on existing company → change name, add emails
4. Company with multiple email addresses → all emails can request magic link

**Dependencies:** None (unblocks Phase 9)

**Priority:** CRITICAL — do this first

---

## Phase 9: Invitations & Form

**Goal:** Get invitation emails out to all 19 businesses with working forms.

**Plans:** 3 plans

Plans:
- [x] 09-01-PLAN.md — Remove N/A from qualitative options (except Leadership)
- [x] 09-02-PLAN.md — Business import from spreadsheet
- [x] 09-03-PLAN.md — Bulk invitation emails to all businesses

**Requirements:**
- ADMIN-03: Bulk email invitations with personalized links
- ADMIN-04: Import all 19 businesses from spreadsheet
- FORM-08: Remove "Not Applicable" from all questions except Leadership

**Success Criteria:**
1. Admin clicks "Send Invitations" → all 19 businesses receive email with their unique link
2. All 19 businesses from spreadsheet exist in system with correct contact emails
3. Form shows "Not Applicable" only on Leadership Alignment question

**Dependencies:** Phase 8 (magic link must work first)

**Priority:** HIGH — enables businesses to start filling forms

---

## Phase 10: Consultant View & Reporting

**Goal:** Consultant role sees results without financials, improved portfolio management.

**Plans:** 5 plans

Plans:
- [x] 10-01-PLAN.md — Consultant role with filtered data access (DB migration + auth types)
- [x] 10-02-PLAN.md — Portfolio-level action creation with business dropdown
- [x] 10-03-PLAN.md — Batch PDF export (Print All button with ZIP download)
- [x] 10-04-PLAN.md — [GAP CLOSURE] Filter financial data from comparison & submission displays
- [x] 10-05-PLAN.md — Role management UI (super admin can assign/change roles)

**Requirements:**
- AUTH-08: Consultant role sees qualitative + AI summaries, NO financials
- ACTION-04: Add actions from portfolio level with business dropdown
- REPORT-07: Print all scorecards at once

**Success Criteria:**
1. Dylan (consultant role) views company → sees scores, AI summary, heat map — no revenue/EBITDA figures
2. Admin on portfolio page → "Add Action" → dropdown to select business → action assigned
3. Admin clicks "Print All" → PDF generated with all company scorecards

**Dependencies:** Phase 9 (need businesses in system)

**Priority:** MEDIUM — can be done while businesses fill forms

---

## Phase 11: Meeting Persistence

**Goal:** Transform ephemeral meeting prep into persistent, searchable knowledge system.

**Plans:** 1 plan

Plans:
- [x] 11-01-PLAN.md — Meeting persistence (Granola-style UX, full-text search)

**Requirements:**
- MEETING-01: Persistent meeting records with AI summaries and user notes

**Success Criteria:**
1. Admin generates Meeting Prep → auto-saved with portfolio snapshot
2. User notes editable with debounced auto-save
3. Actions created from meeting linked via meeting_id FK
4. Search across all meetings via full-text search
5. Finalize meeting locks editing

**Dependencies:** Phase 10 (Meeting Prep feature exists)

**Priority:** MEDIUM — enhances existing feature

---

## Execution Order

```
Phase 8 ─────────────────────────► [Shane uploads data]
                                          │
Phase 9 ──────────────────────────────────┴──► [Emails sent, businesses fill forms]
                                                        │
Phase 10 ───────────────────────────────────────────────┴──► [Consultant view ready for Friday]
                                                                      │
Phase 11 ─────────────────────────────────────────────────────────────┴──► [Meeting history searchable]
```

---
*Roadmap created: 2026-02-03*
*Last updated: 2026-02-04 — Phase 11 complete (Meeting Persistence)*
