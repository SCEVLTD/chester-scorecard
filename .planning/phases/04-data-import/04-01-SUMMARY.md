# Phase 4 Plan 1: Excel Parser Core Summary

**One-liner:** Browser-based Excel parser with SheetJS, column alias mapping for 26 header variations, and business name matching with suffix normalization.

## What Was Built

### Files Created/Modified

| File | Change | Lines |
|------|--------|-------|
| src/schemas/import-row.ts | Created | 54 |
| src/lib/excel-import-parser.ts | Created | 410 |
| package.json | Modified (dependencies) | +2 |

### Key Exports

**src/schemas/import-row.ts:**
- `importRowSchema` - Zod validation for import rows
- `ImportRow` - TypeScript type for parsed rows
- `ValidatedImportRow` - Row with businessId after matching
- `ParseResult` - Full result with valid/invalid rows

**src/lib/excel-import-parser.ts:**
- `parseExcelFile(file)` - Read Excel/CSV in browser
- `mapColumnsToFields(rows, headers)` - Apply column aliases
- `normalizeMonth(value)` - Handle date format variations
- `matchBusinessNames(rows, businesses)` - Map names to UUIDs
- `validateImportRows(rows, businesses)` - Full validation pipeline
- `COLUMN_ALIASES` - 26 header variations to 13 canonical fields

### Column Alias Coverage

| Category | Aliases | Canonical Field |
|----------|---------|-----------------|
| Business | business, business name, company, company name | businessName |
| Period | month, period, date | month |
| Revenue | sales, revenue, turnover | revenue |
| Revenue Target | sales target, revenue target, budget sales, sales budget | revenueTarget |
| Gross Profit | gross profit, gp | grossProfit |
| GP Target | gp target, gross profit target, gp budget | grossProfitTarget |
| EBITDA | ebitda, net profit, ebit, profit | ebitda |
| EBITDA Target | ebitda target, net profit target, ebitda budget, profit target | ebitdaTarget |
| Overheads | overheads, costs, operating costs | overheads |
| Overheads Target | overheads budget, overheads target, costs budget | overheadsTarget |
| Wages | wages, total wages, payroll | totalWages |
| Calls | outbound calls, calls | outboundCalls |
| Orders | first orders, new accounts, new customers | firstOrders |

### Date Format Support

`normalizeMonth()` handles:
- YYYY-MM (pass-through)
- Date objects (Excel cellDates: true)
- "Jan 2021" / "January 2021"
- "01/2021" / "1/2021"
- "2021/01"
- Excel serial date numbers

### Business Name Normalization

`normalizeBusinessName()` removes:
- Case differences (lowercase)
- Whitespace (trim)
- Common suffixes: Ltd, Ltd., Limited, PLC, Inc, Inc., LLC

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Use Zod v4 `.issues` instead of `.errors` | Zod v4 changed error structure |
| Import SSF from xlsx top-level | SSF not on utils in current xlsx types |
| All financial fields optional in schema | Historical data may be incomplete |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Zod v4 error structure**
- **Found during:** Task 3
- **Issue:** `result.error.errors` doesn't exist in Zod v4
- **Fix:** Changed to `result.error.issues`
- **Files modified:** src/lib/excel-import-parser.ts
- **Commit:** 90f0e5c

**2. [Rule 3 - Blocking] Fixed xlsx SSF import**
- **Found during:** Task 2
- **Issue:** `utils.SSF` not in type definitions
- **Fix:** Import `SSF` directly from xlsx
- **Files modified:** src/lib/excel-import-parser.ts
- **Commit:** 25b4841 (fixed before commit)

## Verification Results

| Check | Status |
|-------|--------|
| xlsx installed | v0.18.5 |
| react-dropzone installed | v14.4.0 |
| TypeScript compiles | Pass |
| Build succeeds | Pass |
| All exports available | Pass |

## Next Phase Readiness

**Ready for Plan 04-02 (Import UI Components):**
- Parser library complete
- Column aliases cover expected variations
- Validation returns structured results for UI display
- Business matching ready for preview display

**Dependencies for 04-02:**
- Need to create ExcelImportDropzone using react-dropzone
- Need ImportPreviewTable to show valid/invalid rows
- Need to display unmatched businesses for user resolution

## Metrics

| Metric | Value |
|--------|-------|
| Duration | 5 minutes |
| Tasks | 3/3 |
| Commits | 3 |
| Lines added | ~470 |

---
*Completed: 2026-02-02*
