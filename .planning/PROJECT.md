# Chester Business Scorecard

## What This Is

A monthly business performance tracking platform for 19 Chester Brethren businesses. Companies submit their own financial data and qualitative assessments through an authenticated portal, receiving a health score (0-100) and AI-generated insights. Individual company data remains private; Chester admins (Shane McEwan, Dylan Shaw) see only aggregated trends and anonymized meeting prep summaries.

## Core Value

**Companies must see ONLY their own data.** Three-tier access: Super Admins (Shane, Scott) see everything; Consultants (Dylan, Nick) see qualitative results and AI summaries without financials; Businesses see only their own data. This confidentiality is what makes businesses willing to participate.

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
- ✓ AUTH-01: Business can log in with email/password — v1.0
- ✓ AUTH-02: Multiple users from same business see same data — v1.0
- ✓ AUTH-03: Chester admin role views all businesses — v1.0
- ✓ AUTH-04: Business user restricted to own data (RLS) — v1.0
- ✓ AUTH-05: Session persists across refresh — v1.0
- ✓ FORM-01: Single form combining financials + qualitative — v1.0
- ✓ FORM-02: Financial fields (Revenue, GP, Overheads, EBITDA) — v1.0
- ✓ FORM-03: Lead KPIs (outbound calls, first orders) — v1.0
- ✓ FORM-04: Qualitative scoring (6 categories) — v1.0
- ✓ FORM-05: Commentary fields (wins, challenges, opportunity, risk) — v1.0
- ✓ FORM-06: Month selector visible — v1.0
- ✓ FORM-07: EBITDA auto-calculates with manual override — v1.0
- ✓ DATA-01: Import historical sales from Jan 2021 — v1.0
- ✓ DATA-02: Import historical EBITDA from Jan 2025 — v1.0
- ✓ DATA-03: Import 2026 annual targets — v1.0
- ✓ DATA-04: Self-service upload for Chester admins — v1.0
- ✓ REPORT-01: Individual scorecard with RAG status — v1.0
- ✓ REPORT-02: AI-generated insights per business — v1.0
- ✓ REPORT-03: Aggregated portfolio summary (anonymized) — v1.0
- ✓ REPORT-04: Meeting prep AI summary — v1.0
- ✓ REPORT-05: PDF export per business — v1.0
- ✓ REPORT-06: Heat map by month — v1.0
- ✓ ACTION-01: Capture actions against businesses — v1.0
- ✓ ACTION-02: Display pending actions on dashboard — v1.0
- ✓ ACTION-03: Mark actions complete — v1.0
- ✓ REMIND-01: Automated email reminders for submission — v1.0
- ✓ REMIND-02: Track submission status per business — v1.0
- ✓ REMIND-03: Configurable reminder frequency — v1.0
- ✓ BRAND-01: Velocity logo on all pages — v1.0
- ✓ BRAND-02: Strapline "Doing good by doing well" — v1.0
- ✓ BRAND-03: Chester Brethren Business Group naming — v1.0

### Active

**Current Milestone: v1.1 — Friday Launch Ready**

Goal: Get all 19 businesses submitting forms before Friday meeting, with proper role-based access.

- [ ] AUTH-06: Fix magic link authentication (broken in demo)
- [ ] AUTH-07: Super Admin role (Shane, Scott) sees all individual company data
- [ ] AUTH-08: Consultant role (Dylan, Nick) sees qualitative results, AI summaries — NO financials
- [ ] ADMIN-01: Add/edit companies after creation
- [ ] ADMIN-02: Add/edit email addresses for existing companies
- [ ] ADMIN-03: Bulk email invitations with personalized links
- [ ] ADMIN-04: Add all 19 businesses from spreadsheet
- [ ] FORM-08: Remove "Not Applicable" from all questions except Leadership
- [ ] ACTION-04: Add actions from portfolio level with business dropdown
- [ ] REPORT-07: Print all scorecards at once

### Out of Scope

- Real-time chat between businesses — meetings are in-person
- OAuth/social login — email/password sufficient for 19 businesses
- Mobile app — web-first, responsive design sufficient
- Public registration — businesses added by Chester admins only
- Individual business comparison visible to other businesses — confidentiality violation
- Individual business names in aggregated AI summaries — confidentiality requirement

## Context

**Current State (v1.0 MVP):**
- 16,699 lines TypeScript/SQL
- Tech stack: React 18, Vite, Supabase (Frankfurt EU), Tailwind CSS, shadcn/ui, TanStack Query
- 7 phases completed, 15 plans executed
- Ready for Feb 7, 2026 Friday meeting demo

**Key stakeholders:**
- Shane McEwan — Super Admin, collects data, uploads historical info
- Scott Markham — Super Admin, system owner
- Dylan Shaw — Consultant, meeting facilitator
- Nick Siderfin — Consultant, advisor

**Known blockers (require manual deployment):**
- Edge Functions need deployment with Supabase credentials
- RESEND_API_KEY needs setting for reminder emails
- velocitygrowth.co.uk domain needs verification in Resend

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Merged company submission + scorecard into one form | Companies fill everything themselves, no consultant | ✓ Good — cleaner UX |
| Email/domain-based auth (one login per company) | Multiple users see same data, prevents duplicates | ✓ Good — simple for 19 businesses |
| Lead KPIs: outbound calls + first orders | Most businesses track these, agreed in meeting | ✓ Good — quick wins visible |
| Logo as separate TS module (85KB base64) | Too large for inline, clean imports | ✓ Good — keeps components clean |
| RLS policies for data isolation | Database-level security, consistent enforcement | ✓ Good — confidentiality enforced |
| Meeting summary uses aggregatePortfolio | Reuses existing anonymization pattern | ✓ Good — consistent, token-efficient |
| Two-column submitted/pending layout | Clear visual separation for admin dashboard | ✓ Good — easy to scan |
| Resend for email delivery | Developer-friendly API, reliable | — Pending verification |

## Constraints

- **Timeline**: Feb 7, 2026 meeting (DEMO READY)
- **Confidentiality**: GDPR-compliant, NDA and DPA signed
- **Tech Stack**: React/Supabase architecture
- **Branding**: Chester/Velocity branding applied
- **Simplicity**: Form completable in ~10 minutes
- **Data hosting**: EU-based (Supabase Frankfurt)

---
*Last updated: 2026-02-03 after v1.1 milestone started*
