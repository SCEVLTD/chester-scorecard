# Requirements: Chester Business Scorecard

**Defined:** 2026-02-02
**Core Value:** Companies see ONLY their own data; Chester admins see aggregated insights that cannot identify individual businesses.

## v1 Requirements

Requirements for initial release (Feb 7, 2026 meeting).

### Authentication

- [ ] **AUTH-01**: Business can log in with email/password
- [ ] **AUTH-02**: Multiple users from same business see the same data (domain-based or shared credentials)
- [ ] **AUTH-03**: Chester admin role can view all businesses and aggregated reports
- [ ] **AUTH-04**: Business user role restricted to their own company's data only
- [ ] **AUTH-05**: Session persists across browser refresh

### Unified Company Form

- [ ] **FORM-01**: Single form combining financials + qualitative scoring sections
- [ ] **FORM-02**: Financial fields: Revenue, Gross Profit, Overheads, EBITDA (actual vs target)
- [ ] **FORM-03**: Lead KPI fields: Outbound calls (number), First orders/new accounts (number)
- [ ] **FORM-04**: Qualitative scoring: Leadership, Market demand, Marketing, Product, Suppliers, Sales
- [ ] **FORM-05**: Commentary fields: Wins, Challenges, Biggest opportunity, Biggest risk
- [ ] **FORM-06**: Form shows which month is being submitted
- [ ] **FORM-07**: Form auto-calculates EBITDA from GP - Overheads (with manual override)

### Data Import

- [ ] **DATA-01**: Import historical sales data (from Jan 2021) from Shane's Excel
- [ ] **DATA-02**: Import historical EBITDA data (from Jan 2025) from Shane's Excel
- [ ] **DATA-03**: Import 2026 annual targets per business
- [ ] **DATA-04**: Self-service upload tool for Chester admins (no BrandedAI handling raw data)

### Reporting

- [ ] **REPORT-01**: Individual scorecard view showing score (0-100) with RAG status
- [ ] **REPORT-02**: AI-generated insights per business (opportunities, risks, recommended actions)
- [ ] **REPORT-03**: Aggregated portfolio summary for Chester admins (trends, no individual identification)
- [ ] **REPORT-04**: Meeting prep AI summary: aggregated wins, challenges, discussion points
- [ ] **REPORT-05**: PDF export of individual business scorecard
- [ ] **REPORT-06**: Heat map showing scores by month across portfolio

### Action Tracking

- [ ] **ACTION-01**: Capture actions from meetings against specific businesses
- [ ] **ACTION-02**: Display pending actions on business dashboard
- [ ] **ACTION-03**: Mark actions as complete

### Reminders

- [ ] **REMIND-01**: Automated email reminders for monthly data submission
- [ ] **REMIND-02**: Track submission status per business per month
- [ ] **REMIND-03**: Configurable reminder frequency (daily until submitted)

### Branding

- [x] **BRAND-01**: Velocity logo on all pages
- [x] **BRAND-02**: Strapline from PowerPoint ("Doing good by doing well")
- [x] **BRAND-03**: Chester Brethren Business Group naming

## v2 Requirements

Deferred to future release.

### Enhanced Analytics

- **ANALYTICS-01**: Trend analysis comparing year-over-year performance
- **ANALYTICS-02**: Benchmark comparison against sector averages
- **ANALYTICS-03**: Predictive insights based on historical patterns

### Notifications

- **NOTIF-01**: In-app notifications for new submissions
- **NOTIF-02**: Email digest of portfolio performance for admins

## Out of Scope

| Feature | Reason |
|---------|--------|
| Business-to-business comparison visible to users | Confidentiality violation |
| Public registration | Businesses added by Chester admin only |
| Mobile app | Web-first, responsive design sufficient |
| Real-time chat | Meetings are in-person |
| OAuth/social login | Email/password sufficient for 19 businesses |
| Individual business names in aggregated AI summaries | Confidentiality requirement |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| FORM-01 | Phase 2 | Pending |
| FORM-02 | Phase 2 | Pending |
| FORM-03 | Phase 2 | Pending |
| FORM-04 | Phase 2 | Pending |
| FORM-05 | Phase 2 | Pending |
| FORM-06 | Phase 2 | Pending |
| FORM-07 | Phase 2 | Pending |
| DATA-01 | Phase 3 | Pending |
| DATA-02 | Phase 3 | Pending |
| DATA-03 | Phase 3 | Pending |
| DATA-04 | Phase 3 | Pending |
| REPORT-01 | Phase 4 | Pending |
| REPORT-02 | Phase 4 | Pending |
| REPORT-03 | Phase 4 | Pending |
| REPORT-04 | Phase 4 | Pending |
| REPORT-05 | Phase 4 | Pending |
| REPORT-06 | Phase 4 | Pending |
| ACTION-01 | Phase 5 | Pending |
| ACTION-02 | Phase 5 | Pending |
| ACTION-03 | Phase 5 | Pending |
| REMIND-01 | Phase 6 | Pending |
| REMIND-02 | Phase 6 | Pending |
| REMIND-03 | Phase 6 | Pending |
| BRAND-01 | Phase 1 | Complete |
| BRAND-02 | Phase 1 | Complete |
| BRAND-03 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-02 after initial definition*
