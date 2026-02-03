# Roadmap: Chester Business Scorecard v1.1

**Milestone:** v1.1 Friday Launch Ready
**Goal:** Get all 19 businesses submitting forms before Friday meeting
**Phases:** 8-10 (continues from v1.0)

## Overview

| Phase | Name | Goal | Requirements | Success Criteria |
|-------|------|------|--------------|------------------|
| 8 | Access & Data Setup | Unblock company login and data upload | AUTH-06, AUTH-07, ADMIN-01, ADMIN-02 | 4 |
| 9 | Invitations & Form | Send emails, businesses can submit | ADMIN-03, ADMIN-04, FORM-08 | 3 |
| 10 | Consultant View & Reporting | Role-based views, portfolio actions | AUTH-08, ACTION-04, REPORT-07 | 3 |

**Total:** 3 phases, 10 requirements

---

## Phase 8: Access & Data Setup

**Goal:** Fix blocking issues so companies can log in and Shane can upload historical data.

**Plans:** 3 plans

Plans:
- [ ] 08-01-PLAN.md — Fix magic link authentication (Dashboard config + verification)
- [ ] 08-02-PLAN.md — Admin company edit UI (edit dialog for portfolio page)
- [ ] 08-03-PLAN.md — Multiple emails per company (company_emails table + UI)

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

## Execution Order

```
Phase 8 ─────────────────────────► [Shane uploads data]
                                          │
Phase 9 ──────────────────────────────────┴──► [Emails sent, businesses fill forms]
                                                        │
Phase 10 ───────────────────────────────────────────────┴──► [Consultant view ready for Friday]
```

---
*Roadmap created: 2026-02-03*
*Last updated: 2026-02-03*
