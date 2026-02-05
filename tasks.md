# Chester Business Scorecard - Amendment Tasks

> Last updated: 2026-02-05
> Status: Planning complete, ready for implementation

## Overview

Six major amendments required to the Chester Business Scorecard system:

1. **Historical Data Visibility** - Revenue/EBITDA history per company (2025 + 2026 targets)
2. **City Aggregate View** - Chester group-wide progress dashboard
3. **Two-Level Data Display** - Company vs City views with confidentiality
4. **Auto-fill Targets** - Pre-populate revenue/EBITDA targets on submission
5. **AI Analysis Enhancement** - Include historical data in AI prompts
6. **E-Profile Categorisation** - Report progress by E-Profile category (E0-E5)

---

## E-Profile Categories Reference

| Code | Name | Annual Revenue Range |
|------|------|---------------------|
| E0 | Entry | <£0.5m |
| E1 | Emerging | £0.5m-£1.5m |
| E2 | Expansion | £1.5m-£5m |
| E3 | Elevation | £5m-£11m |
| E4 | Established | £11m-£20m |
| E5 | Enterprise | £20m+ |

---

## Phase 1: Database Schema

### Task 1.1: Create company_annual_targets table
- **Status:** pending
- **File:** `supabase/migrations/20260205_add_annual_targets.sql`
- **Details:**
  - `id` (uuid PK)
  - `business_id` (uuid FK -> businesses)
  - `year` (integer)
  - `revenue_target` (numeric)
  - `ebitda_target` (numeric)
  - `monthly_revenue_targets` (jsonb, optional 12-value array)
  - `monthly_ebitda_targets` (jsonb, optional 12-value array)
  - `created_at`, `updated_at`, `created_by`
  - UNIQUE(business_id, year)

### Task 1.2: Create company_monthly_financials table
- **Status:** pending
- **Depends on:** 1.1
- **File:** `supabase/migrations/20260205_add_monthly_financials.sql`
- **Details:**
  - `id` (uuid PK)
  - `business_id` (uuid FK -> businesses)
  - `month` (text YYYY-MM)
  - `revenue_actual`, `revenue_target` (numeric)
  - `ebitda_actual`, `ebitda_target` (numeric)
  - `source` (text: 'import'|'submission'|'manual')
  - `company_submission_id` (uuid FK, nullable)
  - UNIQUE(business_id, month)
  - Indexes: business_id, month, (business_id, month DESC)

### Task 1.3: Add e_profile to businesses table
- **Status:** pending
- **Depends on:** 1.2
- **File:** `supabase/migrations/20260205_add_eprofile.sql`
- **Details:**
  - Add column `e_profile text CHECK (e_profile IN ('E0','E1','E2','E3','E4','E5'))`
  - Add column `latest_annual_revenue numeric`
  - Add column `latest_revenue_year integer`
  - Create `calculate_e_profile(numeric)` function
  - Create trigger to auto-update e_profile when revenue changes

### Task 1.4: Add EBITDA fields to company_submissions
- **Status:** pending
- **Depends on:** 1.3
- **File:** `supabase/migrations/20260205_add_ebitda_fields.sql`
- **Details:**
  - Add `ebitda_actual numeric`
  - Add `ebitda_target numeric`
  - Migrate existing net_profit_override data to ebitda fields

### Task 1.5: Create city_aggregate_view
- **Status:** pending
- **Depends on:** 1.4
- **File:** `supabase/migrations/20260205_add_city_view.sql`
- **Details:**
  - Monthly aggregates: total revenue/EBITDA target/actual
  - Business count (with/without EBITDA)
  - E-Profile breakdown (count and revenue per category)
  - Variance calculations

### Task 1.6: Add RLS policies for new tables
- **Status:** pending
- **Depends on:** 1.5
- **File:** `supabase/migrations/20260205_add_new_rls_policies.sql`
- **Details:**
  - `company_annual_targets`: super_admin full, consultant read, business_user own only
  - `company_monthly_financials`: super_admin full, consultant read, business_user own only
  - Create `is_super_admin()` helper function

### Task 1.7: Update TypeScript types
- **Status:** pending
- **Depends on:** 1.6
- **File:** `src/types/database.types.ts`
- **Details:**
  - Add `CompanyAnnualTargets` type
  - Add `CompanyMonthlyFinancials` type
  - Extend `Business` with `e_profile`, `latest_annual_revenue`, `latest_revenue_year`
  - Extend `CompanySubmission` with `ebitda_actual`, `ebitda_target`

---

## Phase 2: Data Migration & Import

### Task 2.1: Migrate existing data to new tables
- **Status:** pending
- **Depends on:** 1.7
- **File:** `supabase/migrations/20260205_migrate_existing_data.sql`
- **Details:**
  - Copy company_submissions with net_profit_override=true to have ebitda values
  - Create company_monthly_financials from existing company_submissions
  - Calculate and set e_profile for all existing businesses

### Task 2.2: Update Excel import to handle new fields
- **Status:** pending
- **Depends on:** 2.1
- **File:** `src/hooks/use-excel-import.ts`
- **Details:**
  - Add EBITDA target/actual to import mapping
  - Support importing into company_monthly_financials
  - Support setting annual targets during import
  - Support setting e_profile during import

### Task 2.3: Import 2025 historical data
- **Status:** pending
- **Depends on:** 2.2
- **Details:**
  - Import revenue/EBITDA history from Chester Results PDF data
  - Set 2025 targets for all businesses
  - Set 2026 targets for all businesses
  - Populate e_profile for all 15 Chester businesses based on Excel data

---

## Phase 3: Core Hooks

### Task 3.1: Create use-business-targets hook
- **Status:** pending
- **Depends on:** 1.7
- **File:** `src/hooks/use-business-targets.ts`
- **Details:**
  - `useBusinessTargets(businessId, year?)` - fetch targets
  - `useAllBusinessTargets(year?)` - admin view
  - `useUpsertBusinessTarget()` - mutation
  - `useBulkUpsertTargets()` - bulk mutation

### Task 3.2: Create use-monthly-financials hook
- **Status:** pending
- **Depends on:** 1.7
- **File:** `src/hooks/use-monthly-financials.ts`
- **Details:**
  - `useCompanyMonthlyFinancials(businessId, dateRange?)` - fetch company data
  - `useAllMonthlyFinancials(dateRange?)` - admin view
  - `useUpsertMonthlyFinancials()` - mutation

### Task 3.3: Create use-city-aggregate hook
- **Status:** pending
- **Depends on:** 1.7
- **File:** `src/hooks/use-city-aggregate.ts`
- **Details:**
  - `useCityAggregate(year?)` - fetch aggregate data
  - Returns monthly breakdown + YTD + YoY comparison
  - Uses city_aggregate_view

### Task 3.4: Create use-eprofile-report hook
- **Status:** pending
- **Depends on:** 1.7
- **File:** `src/hooks/use-eprofile-report.ts`
- **Details:**
  - `useEProfileReport(filters?)` - fetch grouped data
  - Returns businesses grouped by E-Profile with aggregates
  - Supports filtering by profile categories

---

## Phase 4: City Dashboard

### Task 4.1: Create city summary card component
- **Status:** pending
- **Depends on:** 3.3
- **File:** `src/components/city/city-summary-card.tsx`
- **Details:**
  - Large KPI cards for Revenue, EBITDA, EBITDA %
  - Target vs Actual with variance
  - Business count indicator

### Task 4.2: Create city month table component
- **Status:** pending
- **Depends on:** 3.3
- **File:** `src/components/city/city-month-table.tsx`
- **Details:**
  - Horizontal scrolling table (Jan-Dec + YTD)
  - Rows: Sales Target/Actual, EBITDA Target/Actual, EBITDA %, No. of Businesses
  - Match format from Chester Results PDF

### Task 4.3: Create city YoY comparison component
- **Status:** pending
- **Depends on:** 3.3
- **File:** `src/components/city/city-yoy-comparison.tsx`
- **Details:**
  - 2024 vs 2025/2026 comparison
  - Bar chart showing % increase by month
  - YTD total comparison

### Task 4.4: Create city commentary section
- **Status:** pending
- **Depends on:** 3.3
- **File:** `src/components/city/city-commentary-section.tsx`
- **Details:**
  - Brief commentary text area
  - Editable by admins
  - Bullet point format

### Task 4.5: Create City Dashboard page
- **Status:** pending
- **Depends on:** 4.1, 4.2, 4.3, 4.4
- **File:** `src/pages/city-dashboard.tsx`
- **Route:** `/city`
- **Details:**
  - Combines all city components
  - Year selector filter
  - Export PDF button
  - Accessible to all authenticated users

### Task 4.6: Add City Dashboard to navigation
- **Status:** pending
- **Depends on:** 4.5
- **Files:** `src/pages/home.tsx`, `src/pages/portfolio.tsx`
- **Details:**
  - Add "City Results" button to home page
  - Add link in portfolio page header

---

## Phase 5: Company Performance View

### Task 5.1: Create revenue-ebitda chart component
- **Status:** pending
- **Depends on:** 3.2
- **File:** `src/components/performance/revenue-ebitda-chart.tsx`
- **Details:**
  - Line chart with Target (dashed) vs Actual (solid)
  - Time filter: 6m, 12m, 24m, All
  - Dual display for Revenue and EBITDA

### Task 5.2: Create target-vs-actual table component
- **Status:** pending
- **Depends on:** 3.2
- **File:** `src/components/performance/target-vs-actual-table.tsx`
- **Details:**
  - Monthly breakdown table
  - Columns: Month, Rev Target, Rev Actual, Variance %, EBITDA Target, EBITDA Actual, Variance %

### Task 5.3: Create YTD summary card component
- **Status:** pending
- **Depends on:** 3.2
- **File:** `src/components/performance/ytd-summary-card.tsx`
- **Details:**
  - YTD totals for revenue and EBITDA
  - Progress bars showing % of annual target achieved

### Task 5.4: Create Company Performance page
- **Status:** pending
- **Depends on:** 5.1, 5.2, 5.3
- **File:** `src/pages/company-performance.tsx`
- **Route:** `/company/:businessId/performance`
- **Details:**
  - Combines performance chart components
  - RLS ensures companies only see their own data
  - Time range filter

### Task 5.5: Link performance page from company dashboard
- **Status:** pending
- **Depends on:** 5.4
- **File:** `src/pages/company/dashboard.tsx`
- **Details:**
  - Add "View Performance History" card/button
  - Navigate to `/company/:businessId/performance`

---

## Phase 6: Auto-fill Targets

### Task 6.1: Update unified-submit form to fetch targets
- **Status:** pending
- **Depends on:** 3.1
- **File:** `src/pages/unified-submit.tsx`
- **Details:**
  - Fetch business targets using useBusinessTargets hook
  - When month is selected, auto-populate revenue/EBITDA targets
  - Show visual indicator for pre-filled fields

### Task 6.2: Update company-submit form to fetch targets
- **Status:** pending
- **Depends on:** 3.1
- **File:** `src/pages/company-submit.tsx`
- **Details:**
  - Fetch targets for the business
  - Auto-populate revenue target and EBITDA target
  - Make fields read-only when pre-filled with explanation text

### Task 6.3: Update scorecard form to use targets
- **Status:** pending
- **Depends on:** 3.1
- **File:** `src/pages/scorecard.tsx`
- **Details:**
  - When creating new scorecard, fetch targets
  - Pre-populate target fields
  - Calculate variance from targets

---

## Phase 7: E-Profile Reporting

### Task 7.1: Create E-Profile filter component
- **Status:** pending
- **Depends on:** 3.4
- **File:** `src/components/eprofile/eprofile-filter.tsx`
- **Details:**
  - Multi-select checkbox group for E0-E5
  - Styled consistently with existing filters

### Task 7.2: Create E-Profile distribution chart
- **Status:** pending
- **Depends on:** 3.4
- **File:** `src/components/eprofile/eprofile-distribution-chart.tsx`
- **Details:**
  - Horizontal bar chart showing business count by E-Profile
  - Option to show with/without EBITDA data

### Task 7.3: Create E-Profile aggregate table
- **Status:** pending
- **Depends on:** 3.4
- **File:** `src/components/eprofile/eprofile-aggregate-table.tsx`
- **Details:**
  - Table grouped by E-Profile
  - Columns: Profile, # Businesses, Rev Target, Rev Actual, %, EBITDA, EBITDA %

### Task 7.4: Create E-Profile detail list
- **Status:** pending
- **Depends on:** 3.4
- **File:** `src/components/eprofile/eprofile-detail-list.tsx`
- **Details:**
  - Expandable list showing businesses within each E-Profile
  - Highlight underperformers that might be masked by larger companies
  - Flag businesses significantly below target

### Task 7.5: Create E-Profile Report page
- **Status:** pending
- **Depends on:** 7.1, 7.2, 7.3, 7.4
- **File:** `src/pages/eprofile-report.tsx`
- **Route:** `/eprofile`
- **Details:**
  - Admin-only access
  - Combines E-Profile components
  - Filter controls

### Task 7.6: Add E-Profile field to business edit dialog
- **Status:** pending
- **Depends on:** 1.3
- **File:** `src/components/admin/business-dialog.tsx`
- **Details:**
  - Add E-Profile dropdown to business create/edit dialog
  - Options: E0, E1, E2, E3, E4, E5
  - Show calculated E-Profile based on revenue (with override option)

---

## Phase 8: AI Analysis Enhancement

### Task 8.1: Update generate-analysis edge function
- **Status:** pending
- **Depends on:** 3.2
- **File:** `supabase/functions/generate-analysis/index.ts`
- **Details:**
  - Fetch company's historical monthly financials (last 12 months)
  - Fetch company's annual targets
  - Include E-Profile context in prompt
  - Add historical trend analysis to AI prompt
  - Compare current performance to historical averages

### Task 8.2: Update AI analysis prompt template
- **Status:** pending
- **Depends on:** 8.1
- **File:** `supabase/functions/generate-analysis/index.ts`
- **Details:**
  - Add section for historical context
  - Include YTD performance vs target
  - Include trend direction (improving/declining)
  - Reference E-Profile expectations for businesses of that size

### Task 8.3: Update AI analysis output schema
- **Status:** pending
- **Depends on:** 8.2
- **File:** `supabase/functions/generate-analysis/index.ts`
- **Details:**
  - Add `historicalContext` field to output
  - Add `trajectoryAssessment` field
  - Update tool definition for Claude

---

## Phase 9: Admin Target Management

### Task 9.1: Create target upload form component
- **Status:** pending
- **Depends on:** 3.1
- **File:** `src/components/admin/target-upload-form.tsx`
- **Details:**
  - Form to set/edit targets for a business
  - Year selector
  - Annual revenue/EBITDA targets
  - Optional monthly breakdown grid

### Task 9.2: Create target grid editor component
- **Status:** pending
- **Depends on:** 3.1
- **File:** `src/components/admin/target-grid-editor.tsx`
- **Details:**
  - Inline editable grid for quick target entry
  - 12 columns (Jan-Dec) x 2 rows (Revenue, EBITDA)
  - Auto-calculate totals

### Task 9.3: Create Targets Management page
- **Status:** pending
- **Depends on:** 9.1, 9.2
- **File:** `src/pages/admin/targets.tsx`
- **Route:** `/admin/targets`
- **Details:**
  - Admin-only access
  - List all businesses with their targets
  - Bulk import from Excel option
  - Edit individual business targets

### Task 9.4: Add targets link to admin navigation
- **Status:** pending
- **Depends on:** 9.3
- **File:** `src/pages/admin.tsx`
- **Details:**
  - Add "Manage Targets" card/link in admin area
  - Navigate to `/admin/targets`

---

## Phase 10: Route Updates

### Task 10.1: Add new routes to App.tsx
- **Status:** pending
- **Depends on:** 4.5, 5.4, 7.5, 9.3
- **File:** `src/App.tsx`
- **Details:**
  - `/city` - CityDashboardPage (all authenticated)
  - `/company/:businessId/performance` - CompanyPerformancePage (business_user own or admin)
  - `/eprofile` - EProfileReportPage (admin only)
  - `/admin/targets` - TargetsManagementPage (admin only)

---

## Implementation Order

**Week 1: Foundation**
- Phase 1 (Database Schema) - All tasks
- Phase 2 (Data Migration) - Tasks 2.1, 2.2

**Week 2: Core Features**
- Phase 3 (Core Hooks) - All tasks
- Phase 6 (Auto-fill Targets) - All tasks

**Week 3: City Dashboard**
- Phase 4 (City Dashboard) - All tasks
- Phase 2.3 (Import historical data)

**Week 4: Company & E-Profile**
- Phase 5 (Company Performance) - All tasks
- Phase 7 (E-Profile) - All tasks

**Week 5: AI & Admin**
- Phase 8 (AI Enhancement) - All tasks
- Phase 9 (Admin Management) - All tasks
- Phase 10 (Routes) - All tasks

---

## Critical Files Reference

| File | Purpose |
|------|---------|
| `supabase/migrations/00000000_full_schema.sql` | Reference for migration patterns |
| `src/types/database.types.ts` | TypeScript types to extend |
| `src/hooks/use-scorecards.ts` | Pattern for new hooks |
| `src/lib/portfolio-aggregator.ts` | Pattern for aggregation logic |
| `src/components/charts/score-trend-chart.tsx` | Pattern for Recharts usage |
| `src/pages/unified-submit.tsx` | Form to modify for auto-fill |
| `supabase/functions/generate-analysis/index.ts` | AI analysis to enhance |

---

## Notes

- All monetary values in GBP (£)
- Month format: YYYY-MM (e.g., "2026-01")
- 15 Chester businesses (9 with EBITDA, 6 without per PDF)
- Current E-Profile distribution from Excel:
  - E0: 4 (Cheshire Fire, Clock Corner, Trigo, Unistow)
  - E1: 2 (Haysdale, Keystone)
  - E2: 6 (Chespack, Hardwoods, HiSpace, Merlin, OptimOil, Spectrum)
  - E3: 2 (Alphabond, Lancastria)
  - E4: 1 (RVT Group)

---

# Consultant View & Display Amendments (2026-02-05)

> Source: Shane meetings (2026-02-02, 2026-02-05)
> Status: ✅ ALL COMPLETE (2026-02-05)

## Phase 11: Consultant View Safety (PRIORITY) ✅

### P2: Remove Admin Functions from Consultant View
- [x] **P2.1** Hide Send Invitations button from consultant view
  - File: `src/pages/portfolio.tsx`
  - Action: Wrap bulk invitation panel in role check
- [x] **P2.2** Hide Send Reminders functionality from consultant view
  - File: `src/components/submission-status-panel.tsx`
- [x] **P2.3** Audit other admin-only actions across pages

### P5: Hide Axis Values on Consultant Charts
- [x] **P5.1** Add `hideAxisValues` prop to score-trend-chart
  - File: `src/components/charts/score-trend-chart.tsx`
- [x] **P5.2** Add `hideAxisValues` prop to section-breakdown-chart
  - File: `src/components/charts/section-breakdown-chart.tsx`
- [x] **P5.3** Add `hideAxisValues` prop to section-comparison-chart
  - File: `src/components/charts/section-comparison-chart.tsx`
- [x] **P5.4** Apply consultant check to charts page
  - File: `src/pages/charts.tsx`
- [x] **P5.5** Apply to business detail page charts
  - File: `src/pages/business.tsx`

---

## Phase 12: Display Improvements ✅

### P1: Display Four Questions on Scorecards
- [x] **P1.1** Link company submission insights to scorecard display
  - Files: `src/pages/business.tsx`, `src/components/business-scorecard-view.tsx`
- [x] **P1.2** Create InsightsCard component
  - File: `src/components/insights-card.tsx` (new)
- [x] **P1.3** Add insights to scorecard PDF export
  - File: `src/components/pdf/scorecard-pdf.tsx`
- [x] **P1.4** Add insights to comparison view
  - File: `src/pages/compare.tsx`

### P4: Filter Section Improvements
- [x] **P4.1** Improve year selector display format
  - File: `src/pages/city-dashboard.tsx`
- [x] **P4.2** Create unified FilterBar component
  - File: `src/components/filter-bar.tsx` (new)
- [x] **P4.3** Apply FilterBar to City Dashboard
- [x] **P4.4** Apply FilterBar to E-Profile Report
- [x] **P4.5** Apply FilterBar to Portfolio page

---

## Phase 13: Enhanced Features ✅

### P6: Consultant Executive Summary AI
- [x] **P6.1** Create consultant-specific analysis prompt
  - File: `supabase/functions/generate-analysis/index.ts`
- [x] **P6.2** Add view mode to analysis hook
  - File: `src/hooks/use-ai-analysis.ts`
- [x] **P6.3** Update portfolio analysis
  - File: `supabase/functions/generate-portfolio-analysis/index.ts`
- [x] **P6.4** Update meeting prep
  - File: `supabase/functions/generate-meeting-summary/index.ts`

### P3: City Dashboard Graphs
- [x] **P3.1** Create CityRevenueChart component
  - File: `src/components/charts/city-revenue-chart.tsx` (new)
- [x] **P3.2** Create CityEbitdaChart component
  - File: `src/components/charts/city-ebitda-chart.tsx` (new)
- [x] **P3.3** Create CityEProfileChart component
  - File: `src/components/charts/city-eprofile-chart.tsx` (new)
- [x] **P3.4** Add graph/table toggle to City Dashboard
  - File: `src/pages/city-dashboard.tsx`

---

## Phase 14: Polish ✅

### P7: Additional Items
- [x] **P7.1** Remove "Not Applicable" from form questions (keep only for Leadership)
  - File: `src/pages/company-submit.tsx`
- [x] **P7.2** Add actions from portfolio view
  - File: `src/pages/portfolio.tsx`
- [x] **P7.3** Print all scorecards functionality
  - File: `src/pages/portfolio.tsx`

---

## Implementation Summary

**Commits:**
- `f824598` - feat(charts): add hideAxisValues prop for consultant view
- `d1fb181` - feat: add unified FilterBar component for consistent filtering
- `aee6913` - feat: display company insights on scorecard view and PDF export
- `6bf4244` - feat: add City Dashboard graph view with revenue/EBITDA/E-Profile charts
- `b476f92` - feat: consultant view restrictions and AI executive summaries

**New Files Created:**
- `src/components/filter-bar.tsx`
- `src/components/insights-card.tsx`
- `src/components/charts/city-revenue-chart.tsx`
- `src/components/charts/city-ebitda-chart.tsx`
- `src/components/charts/city-eprofile-chart.tsx`
