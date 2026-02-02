# Phase 4 Plan 2: Import UI Components Summary

**One-liner:** Complete admin import workflow with drag-drop file upload, column detection, business name matching, preview with validation display, bulk upsert to database, and progress tracking.

## What Was Built

### Files Created/Modified

| File | Change | Lines |
|------|--------|-------|
| src/components/admin/excel-import-dropzone.tsx | Created | 48 |
| src/components/admin/import-preview-table.tsx | Created | 91 |
| src/components/admin/import-progress.tsx | Created | 54 |
| src/hooks/use-excel-import.ts | Created | 166 |
| src/pages/admin/import.tsx | Created | 182 |
| src/App.tsx | Modified (route) | +6 |
| src/pages/home.tsx | Modified (import button) | +9 |

### Key Exports

**src/components/admin/excel-import-dropzone.tsx:**
- `ExcelImportDropzone` - Drag-drop file upload component with react-dropzone

**src/components/admin/import-preview-table.tsx:**
- `ImportPreviewTable` - Shows parsed rows, column detection, validation status, unmatched businesses

**src/components/admin/import-progress.tsx:**
- `ImportProgress` - Progress bar and success/failure counts during import

**src/hooks/use-excel-import.ts:**
- `useExcelImport` - Mutation hook that creates data_requests and upserts company_submissions

**src/pages/admin/import.tsx:**
- `AdminImportPage` - Full import workflow page at /admin/import

### Import Workflow

1. **File Selection** - Admin drags Excel/CSV file into dropzone
2. **Parsing** - SheetJS parses file, extracts headers and data rows
3. **Column Mapping** - Headers matched to canonical fields using 26 alias variations
4. **Business Matching** - Business names normalized and matched to database IDs
5. **Preview** - Table shows valid/invalid rows, unmatched businesses highlighted
6. **Confirmation** - Admin clicks "Import N Rows" button
7. **Bulk Upsert** - Each valid row creates data_request + company_submission
8. **Progress** - Real-time progress bar with success/failure counts
9. **Completion** - Toast notification and option to import another file

### Database Integration

**For each valid row:**
1. Find existing data_request for business+month OR create new one
2. Upsert company_submission with onConflict: 'data_request_id'
3. Calculate EBITDA from GP - Overheads if not provided explicitly
4. Mark submitted_by_name = 'Historical Import' for audit trail
5. Qualitative fields null (no self-assessment for historical data)

### UI Features

- Drag-drop zone with file type validation (.xlsx, .xls, .csv)
- File name display after selection
- Detected columns summary at top of preview
- Red highlight box for unmatched business names
- Valid/Invalid row counts with badges
- Scrollable preview table (max 96rem height)
- Progress bar during import
- Success/failure counts on completion
- Error details (first 10 errors shown, with overflow count)

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Upsert with onConflict: 'data_request_id' | Allows re-running import to update existing months |
| Missing financials default to 0 | Can be updated later; prevents null issues |
| productivity_benchmark defaults to 2.5 | Typical value; adjustable per submission |
| Qualitative fields null for imports | Historical data has no self-assessment |
| submitted_by_name = 'Historical Import' | Clear audit trail for imported vs submitted data |

## Deviations from Plan

None - plan executed exactly as written.

## Database Migrations Applied During Testing

During human verification testing, the following migrations were applied:

1. **add_lead_kpis** - Added outbound_calls, first_orders columns to company_submissions
2. **add_unified_submission_columns** - Added qualitative scoring columns for unified form

These migrations were required for the import to write lead KPI data.

## Verification Results

| Check | Status |
|-------|--------|
| Components compile | Pass |
| Hook compiles | Pass |
| Page accessible at /admin/import | Pass |
| Route protected for admins | Pass |
| File upload works | Pass |
| Column detection correct | Pass |
| Business matching works | Pass |
| Unmatched businesses highlighted | Pass |
| Preview shows valid/invalid counts | Pass |
| Import creates data_requests | Pass |
| Import upserts company_submissions | Pass |
| Re-import updates (not duplicates) | Pass |
| Data visible in business history | Pass |

## Success Criteria Status

| Criteria | Status |
|----------|--------|
| Admin can access /admin/import | Pass |
| Non-admins blocked | Pass |
| Dropzone accepts .xlsx, .xls, .csv | Pass |
| Parser detects column variations | Pass |
| Business names matched to IDs | Pass |
| Unmatched businesses displayed | Pass |
| Preview shows validation status | Pass |
| Import button only when valid rows exist | Pass |
| Progress bar updates | Pass |
| Success/failure counts accurate | Pass |
| Data appears in scorecard history | Pass |
| Re-running import updates existing | Pass |

## Next Phase Readiness

**Ready for Plan 04-03 (Data Export/Sync) if needed:**
- Import infrastructure complete
- Admin can self-service upload historical data
- Data properly integrated with existing scorecard views

**Data Import Phase Complete:**
- Core parser from 04-01
- Complete UI workflow from 04-02
- Chester admins can now import Shane's historical Excel data without developer assistance

## Metrics

| Metric | Value |
|--------|-------|
| Duration | ~25 minutes (including checkpoint verification) |
| Tasks | 4/4 (3 auto + 1 checkpoint) |
| Commits | 3 |
| Lines added | ~556 |

### Commits

| Hash | Message |
|------|---------|
| cf67ef9 | feat(04-02): add import UI components |
| 4127c03 | feat(04-02): add Excel import hook with bulk upsert |
| 7a5b452 | feat(04-02): add admin import page and route |

---
*Completed: 2026-02-02*
