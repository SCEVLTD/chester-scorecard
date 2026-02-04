# Chester Scorecard Changelog

## 2026-02-04

### Simplified Company Submission Form
- **Removed** Gross Profit, Overheads, and Wages fields from company submission
- **Simplified** to Revenue + EBITDA only for financial data
- **Removed** Productivity Data section (no longer captured)
- **Added** Lead KPIs: Outbound Calls and First Orders

### Scorecard View Updates
- **Added** "See Data" toggle button to switch between scores view and detailed submitted data view
- **Shows** actual vs target values with percentage variances (e.g. "£50,000 vs £40,000, +25.0%")
- **Added** Edit button to modify submitted data (navigates to unified submit form)
- **Removed** "New Scorecard" button from history page (companies submit data, not create scorecards)

### Edit Functionality
- **Fixed** Edit navigation to go to correct unified submit form (`/company/:id/submit`)
- **Fixed** Month auto-fill when editing (pre-selects from query parameter)
- **Ensured** form pre-fills all existing data when editing (financials, Lead KPIs, qualitative selections, company insights)

### AI Analysis Updates
- **Updated** to use simplified data only (Revenue + EBITDA)
- **Removed** old metrics from analysis (GP, Overheads, Productivity)
- **Added** Lead KPIs (Outbound Calls, First Orders) to analysis context
- **Added** Company Insights (Opportunity, Risk, Wins, Challenges) to analysis
- **Updated** inconsistency detection rules for simplified data model

### Language & Formatting
- **Changed** to UK English throughout (adviser, prioritise, analyse, organisation)
- **Removed** unnecessary dashes:
  - "Self-Assessment" → "Self Assessment"
  - "30-Day" → "30 Day"
  - "Market-leading" → "Market leading"
  - "150-250" → "150 to 250"
- **Added** instruction to AI: "Use UK English spelling throughout"

### Commits
- `bd59de0` - feat(ui): add See Data toggle to scorecard view
- `7200b95` - fix(ui): simplify data view to Revenue + EBITDA only
- `8b23435` - fix(edit): navigate to correct form and pre-fill data
- `8be95a5` - fix(ui): remove New Scorecard button and fix month auto-fill
- `961bb82` - fix(ai): update analysis to use simplified data only
- `1f34cf3` - fix(ai): use UK English and remove unnecessary dashes

### Edge Function Deployments
- `generate-analysis` v13 - Updated for simplified data model
- `generate-analysis` v14 - UK English and dash formatting
