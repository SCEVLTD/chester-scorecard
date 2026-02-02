# Chester Business Scorecard

## What This Is

A monthly business performance tracking platform for 19 Chester Brethren businesses. Companies submit their own financial data and qualitative assessments, receiving a health score (0-100) and AI-generated insights. Individual company data remains private; Chester admins (Shane McEwan, Dylan Shaw) see only aggregated trends and summaries.

## Core Value

**Companies must see ONLY their own data.** Chester admins see aggregated insights that cannot identify individual businesses. This confidentiality is what makes businesses willing to participate.

## Requirements

### Validated

- ✓ Scorecard scoring system (100-point scale) — existing
- ✓ Financial variance calculations — existing
- ✓ Qualitative scoring sections (leadership, market, product, suppliers, sales) — existing
- ✓ AI analysis generation via Claude — existing
- ✓ PDF export per business — existing
- ✓ Portfolio heatmap view — existing
- ✓ Business comparison view — existing
- ✓ Magic link company submission flow — existing
- ✓ Chester branding on company submission page — existing

### Active

- [ ] **AUTH-01**: Business-level authentication (one login per company, multiple users see same data)
- [ ] **AUTH-02**: Chester admin role can view all businesses and aggregated reports
- [ ] **AUTH-03**: Business user role can only view their own company's data
- [ ] **FORM-01**: Unified company form combining financials + qualitative scoring sections
- [ ] **FORM-02**: Add Lead KPIs: outbound calls (number), first orders/new accounts (number)
- [ ] **FORM-03**: Form auto-saves to allow partial completion across sessions
- [ ] **DATA-01**: Import historical data (Sales from 2021, EBITDA from Jan 2025) from Shane's Excel
- [ ] **DATA-02**: Annual targets stored once and reused for monthly comparisons
- [ ] **REPORT-01**: Aggregated portfolio summary showing trends without identifying businesses
- [ ] **REPORT-02**: AI summary for meetings: aggregated wins, challenges, recommended discussion points
- [ ] **REPORT-03**: Individual business summary sheet for meeting prep (PDF)
- [ ] **ACTION-01**: Capture actions from meetings against businesses
- [ ] **ACTION-02**: Display pending actions on business dashboard
- [ ] **REMIND-01**: Automated email reminders for data submission (configurable frequency)
- [ ] **REMIND-02**: Track submission status per business per month
- [ ] **BRAND-01**: Velocity branding (logo, strapline from PowerPoint)

### Out of Scope

- Real-time chat between businesses — not needed, meetings are in-person
- OAuth/social login — email/password sufficient
- Mobile app — web-first
- Public registration — businesses added by Chester admins only
- Individual business comparison visible to other businesses — confidentiality violation

## Context

**Origin:** Nick Siderfin introduced Chester to the UBT scorecard tool. Chester wants to use it for their 19 local businesses to track monthly performance and prepare for quarterly networking meetings.

**Existing process:** Shane McEwan collects data monthly via Microsoft Forms, produces a consolidated report manually. Response rate ~10/19 businesses. They want automation to reduce manual effort.

**Data already collected:**
- Sales data from January 2021 (monthly, per business)
- EBITDA from January 2025 (monthly, per business)
- 2026 annual targets for sales and EBITDA
- Qualitative feedback from recent MS Forms survey (~10 responses)

**Key stakeholders:**
- Shane McEwan — Collects data, Chester admin
- Dylan Shaw — Chester admin, meeting facilitator
- Nick Siderfin — Introduced the project, advisor

**Timeline pressure:** Meeting next Friday (Feb 7, 2026). Need working system to demo and collect data.

## Constraints

- **Timeline**: Ready for Feb 7, 2026 meeting (5 days)
- **Confidentiality**: GDPR-compliant, NDA and DPA signed (see Docs/)
- **Tech Stack**: Must use existing React/Supabase architecture
- **Branding**: Chester/Velocity branding required
- **Simplicity**: Form must be completable in ~10 minutes, no overwhelming complexity
- **Data hosting**: EU-based (Supabase Frankfurt) per DPA

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Merge company submission + scorecard into one form | Companies fill everything themselves, no consultant | — Pending |
| Use email/domain-based auth (one login per company) | Multiple users from same company see same data, prevents duplicates | — Pending |
| Lead KPIs: outbound calls + first orders | Most businesses already track these, agreed in meeting | — Pending |
| Keep existing qualitative scoring sections | Provides the score that shows trends; turn some off if overwhelming | — Pending |

---
*Last updated: 2026-02-02 after initialization*
