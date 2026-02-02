# Phase 4: Data Import - Research

**Researched:** 2026-02-02
**Domain:** Excel/CSV file parsing, browser-based upload, data import pipeline
**Confidence:** HIGH

## Summary

Phase 4 imports Shane's historical Excel data (sales from 2021, EBITDA from Jan 2025) plus 2026 annual targets into the existing database schema. The codebase already has Excel export functionality using `excel-builder-vanilla` and file-saver. For import, we need the inverse: parse Excel/CSV in the browser and insert into Supabase.

The primary challenge is column mapping: Shane's Excel format is unknown but likely has business names as identifiers (not UUIDs). The import must map business names to database IDs and handle date formats consistently. The existing `company_submissions` table with its relationship to `data_requests` provides the correct data model.

**Primary recommendation:** Use SheetJS `xlsx` library (free, widely used) for parsing Excel files in the browser, paired with a simple drag-drop UI using react-dropzone. Build a preview/validation step before import. Leverage the existing `useCreateUnifiedSubmission` hook pattern but create a bulk version for historical data.

## Existing Schema Analysis

### Core Tables (verified from migrations)

| Table | Purpose | Historical Import Relevance |
|-------|---------|----------------------------|
| `businesses` | Company records with UUID, name, sector_id | Map Excel company names to these IDs |
| `data_requests` | Links business+month, required for submissions | Create for each historical month |
| `company_submissions` | Financial data storage | Target table for imported data |
| `scorecards` | Consultant-reviewed data (has commentary) | NOT used for raw company import |

### company_submissions Columns (from database.types.ts)

```typescript
// Financial metrics (required)
revenue_actual: number
revenue_target: number
gross_profit_actual: number
gross_profit_target: number
overheads_actual: number
overheads_budget: number
net_profit_actual: number  // Can be calculated: GP - Overheads
net_profit_target: number  // Can be calculated: GP_target - Overheads_budget
total_wages: number
productivity_benchmark: number

// Lead KPIs (optional)
outbound_calls: number | null
first_orders: number | null

// Qualitative (null for historical - no self-assessment)
leadership: string | null
market_demand: string | null
// ... etc

// Metadata
submitted_at: string  // Use import date
submitted_by_name: string | null  // "Historical Import"
```

### data_requests Table (required parent)

Every `company_submissions` requires a `data_request_id`. For historical import:
- Create data_request per business+month
- Use token = crypto.randomUUID() (not used for auth)
- Set status = 'submitted'
- Set expires_at = far future date

## Current Data Flow

### Unified Form Submission Pattern (src/hooks/use-unified-submission.ts)

The existing hook demonstrates the correct pattern:

1. Find or create `data_request` for business+month
2. Calculate variances (not stored, computed on read)
3. Upsert to `company_submissions` with `onConflict: 'data_request_id'`
4. Update data_request status

**Key insight:** Variances are NOT stored in company_submissions. The submission stores raw actuals/targets. Variances and scores are calculated at read time. This simplifies import - we just need raw financial values.

### Existing Submission Lookup

```typescript
// Find existing data_request
const { data: request } = await supabase
  .from('data_requests')
  .select('id')
  .eq('business_id', businessId)
  .eq('month', month)
  .maybeSingle()
```

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `xlsx` (SheetJS) | ^0.18.5 | Parse Excel/CSV in browser | Industry standard, 40M+ weekly downloads, handles .xlsx/.xls/.csv |
| `react-dropzone` | ^14.x | Drag-drop file upload UI | Pairs well with shadcn/ui, accessible, well-maintained |

### Supporting

| Library | Purpose | When to Use |
|---------|---------|-------------|
| `zod` | Validate parsed rows | Already in project, use for schema validation |
| `date-fns` | Parse date formats | Already in project, use for month normalization |

### Already Installed (excel-builder-vanilla)

The project already has `excel-builder-vanilla` for export. SheetJS (`xlsx`) is the read-focused counterpart. They do not conflict.

**Installation:**
```bash
npm install xlsx react-dropzone
```

## Architecture Patterns

### Recommended File Structure

```
src/
├── components/
│   └── admin/
│       └── excel-import/
│           ├── excel-import-dropzone.tsx    # Drag-drop UI
│           ├── import-preview-table.tsx     # Preview parsed data
│           └── import-progress.tsx          # Progress/results
├── hooks/
│   └── use-excel-import.ts                  # Import logic
├── lib/
│   └── excel-import-mapper.ts               # Parse Excel to typed rows
└── pages/
    └── admin/
        └── import.tsx                       # Admin-only import page
```

### Pattern 1: Excel Parsing Pipeline

**What:** Transform Excel file -> validated rows -> database inserts
**When to use:** Any bulk data import from user-uploaded file

```typescript
// Source: SheetJS docs + codebase patterns
import { read, utils } from 'xlsx'

type ParsedRow = {
  businessName: string
  month: string
  revenue?: number
  grossProfit?: number
  ebitda?: number
  // ... other fields
}

export async function parseExcelFile(file: File): Promise<ParsedRow[]> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = read(arrayBuffer)
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  const rawData = utils.sheet_to_json<Record<string, unknown>>(worksheet)

  return rawData.map(row => normalizeRow(row))
}
```

### Pattern 2: Business Name Mapping

**What:** Map company names from Excel to database UUIDs
**When to use:** Before inserting historical data

```typescript
// Pre-fetch all businesses for name -> id lookup
const { data: businesses } = await supabase
  .from('businesses')
  .select('id, name')

const businessMap = new Map(
  businesses.map(b => [b.name.toLowerCase().trim(), b.id])
)

// Then for each row:
const businessId = businessMap.get(row.businessName.toLowerCase().trim())
if (!businessId) {
  errors.push({ row: i, error: `Unknown business: ${row.businessName}` })
}
```

### Pattern 3: Bulk Upsert with Preview

**What:** Show preview of what will be imported, then bulk insert
**When to use:** User needs to verify data before commit

```typescript
// Step 1: Parse and validate (no DB writes)
const { validRows, errors } = await parseAndValidate(file, businessMap)

// Step 2: Show preview UI with validRows and errors

// Step 3: On confirmation, bulk insert
for (const row of validRows) {
  await supabase.from('data_requests').upsert({...})
  await supabase.from('company_submissions').upsert({...})
}
```

### Anti-Patterns to Avoid

- **No streaming:** Don't try to process row-by-row during upload. Parse entire file first, then batch insert.
- **No server-side parsing:** SheetJS works fine in browser for reasonably-sized files (<10MB). No need for API endpoint.
- **Don't skip validation:** Always validate before insert. Show errors to user.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Excel parsing | Custom binary parser | SheetJS xlsx | Complex formats, edge cases, dates |
| File upload UI | Native input styling | react-dropzone | Accessibility, drag-drop, validation |
| Date parsing | Regex for dates | date-fns + SheetJS options | Excel date serial numbers are tricky |
| Column mapping | Manual string matching | Fuzzy matching or explicit config | Handles typos, case differences |

**Key insight:** Shane's Excel format is unknown. Build flexible column mapping that can handle header variations:
- "Business" vs "Business Name" vs "Company"
- "Sales" vs "Revenue" vs "Turnover"
- "EBITDA" vs "Net Profit" vs "EBIT"

## Common Pitfalls

### Pitfall 1: Excel Date Formats

**What goes wrong:** Excel stores dates as serial numbers. SheetJS can misparse them.
**Why it happens:** Different date formats, timezone issues, locale-specific parsing.
**How to avoid:** Use SheetJS `cellDates: true` option, then normalize with date-fns.
**Warning signs:** Dates showing as numbers like 44927 instead of "2023-01-15".

```typescript
const workbook = read(arrayBuffer, { cellDates: true })
// Then format: format(row.date, 'yyyy-MM')
```

### Pitfall 2: Business Name Mismatches

**What goes wrong:** Excel has "ABC Ltd" but database has "ABC Limited".
**Why it happens:** Manual data entry inconsistencies.
**How to avoid:** Normalize names before matching (lowercase, trim, remove common suffixes). Show unmatched rows for user to manually map.
**Warning signs:** High unmatched row count.

### Pitfall 3: Missing Required Fields

**What goes wrong:** Import fails because some months don't have all financial data.
**Why it happens:** Historical data may be incomplete, especially early months.
**How to avoid:** Make fields optional in import schema, set defaults (0 or null). Flag incomplete rows in preview.
**Warning signs:** Validation errors on otherwise correct-looking data.

### Pitfall 4: Duplicate Handling

**What goes wrong:** Re-running import creates duplicates or overwrites newer data.
**Why it happens:** Not using upsert, or wrong conflict key.
**How to avoid:** Use `onConflict: 'data_request_id'` for company_submissions. Check for existing data_request by business+month before creating.
**Warning signs:** Multiple rows for same business+month.

## Code Examples

### Excel File Parser

```typescript
// Source: SheetJS docs + project patterns
import { read, utils } from 'xlsx'
import { z } from 'zod'

// Expected row schema (flexible - all optional for import)
const importRowSchema = z.object({
  businessName: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM format'),
  revenue: z.coerce.number().optional(),
  revenueTarget: z.coerce.number().optional(),
  grossProfit: z.coerce.number().optional(),
  grossProfitTarget: z.coerce.number().optional(),
  ebitda: z.coerce.number().optional(),
  ebitdaTarget: z.coerce.number().optional(),
})

export type ImportRow = z.infer<typeof importRowSchema>

// Column header mappings (handles variations)
const COLUMN_ALIASES: Record<string, keyof ImportRow> = {
  'business': 'businessName',
  'business name': 'businessName',
  'company': 'businessName',
  'company name': 'businessName',
  'month': 'month',
  'period': 'month',
  'date': 'month',
  'sales': 'revenue',
  'revenue': 'revenue',
  'turnover': 'revenue',
  'sales target': 'revenueTarget',
  'revenue target': 'revenueTarget',
  'budget sales': 'revenueTarget',
  'gross profit': 'grossProfit',
  'gp': 'grossProfit',
  'gross profit target': 'grossProfitTarget',
  'gp target': 'grossProfitTarget',
  'ebitda': 'ebitda',
  'net profit': 'ebitda',
  'ebitda target': 'ebitdaTarget',
  'net profit target': 'ebitdaTarget',
}
```

### Dropzone Component Pattern

```typescript
// Source: react-dropzone docs + shadcn patterns
import { useDropzone } from 'react-dropzone'
import { Upload } from 'lucide-react'

export function ExcelImportDropzone({ onFileParsed }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    onDrop: async ([file]) => {
      const parsed = await parseExcelFile(file)
      onFileParsed(parsed)
    },
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer',
        isDragActive ? 'border-primary bg-primary/5' : 'border-muted'
      )}
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
      <p className="mt-2">Drag & drop Excel/CSV file, or click to select</p>
    </div>
  )
}
```

## Expected Excel Format

Based on meeting transcript and context:

### Historical Sales Data (from 2021)

Shane likely has monthly data per business. Expected columns:
- Business Name / Company
- Month (various formats: "Jan 2021", "2021-01", etc.)
- Sales / Revenue (actual)
- Sales Target / Budget (optional for historical)

### Historical EBITDA Data (from Jan 2025)

- Business Name / Company
- Month
- EBITDA / Net Profit (actual)
- EBITDA Target (optional)

### 2026 Annual Targets

- Business Name / Company
- Annual Sales Target (divide by 12 for monthly)
- Annual EBITDA Target (divide by 12 for monthly)

**Note:** The exact format is unknown. Build preview UI that shows detected columns and allows user to confirm mapping.

## Import Data Flow

1. **Upload Page (admin only):** Dropzone for file upload
2. **Parse:** SheetJS reads file, converts to JSON array
3. **Detect Columns:** Map Excel headers to known fields using aliases
4. **Validate Rows:** Zod schema validates each row
5. **Match Businesses:** Map business names to database IDs
6. **Preview:** Show table of what will be imported, highlight issues
7. **Confirm:** User clicks "Import" after reviewing
8. **Insert:**
   - Create/find data_request for each business+month
   - Upsert company_submission with financial data
   - Track progress, show results

## Special Handling: Targets

2026 targets should be stored as monthly values. Options:

**Option A: Import as monthly rows**
- Create 12 data_requests per business for 2026
- Store target values in each company_submission

**Option B: Create targets table**
- New `annual_targets` table: business_id, year, revenue_target, ebitda_target
- Calculate monthly targets on the fly

**Recommendation:** Option A - matches existing schema, no migration needed. Import targets as 12 monthly placeholder rows with only target values filled.

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Server-side Excel parsing | Browser-side with SheetJS | No file upload to server |
| Manual column mapping | Alias-based auto-detection | Faster import |
| Single row insert | Batch upsert | Better performance |

## Open Questions

1. **Exact Excel format:** Need sample file from Shane to confirm column names
   - What we know: Sales from 2021, EBITDA from 2025, monthly per business
   - What's unclear: Exact headers, date format, whether targets included
   - Recommendation: Build flexible column mapping, ask Shane for sample

2. **Historical qualitative data:** Should we import any qualitative scores?
   - What we know: MS Forms collected some qualitative feedback
   - What's unclear: Format, whether to include
   - Recommendation: Focus on financial data for v1, add qualitative later

3. **Business name matching:** How to handle new/unknown businesses?
   - What we know: 19 businesses exist
   - What's unclear: Whether Excel has exact same names
   - Recommendation: Show unmatched rows, allow admin to create new businesses or manually map

## Sources

### Primary (HIGH confidence)
- SheetJS official docs: https://docs.sheetjs.com/docs/demos/frontend/react/
- react-dropzone npm: https://www.npmjs.com/package/react-dropzone
- Existing codebase: src/hooks/use-unified-submission.ts, src/lib/excel-mapper.ts

### Secondary (MEDIUM confidence)
- shadcn-dropzone patterns: https://github.com/diragb/shadcn-dropzone
- shadcn file upload: https://www.shadcn.io/components/forms/dropzone

### Context (HIGH confidence)
- Meeting transcript: Docs/Nick_Siderfin_Zoom_Meeting_2026-01-31.md
- Shane mentioned: "We've got from 2021 in sales and Jan 25 in EBITDA for the majority"
- Shane will send Excel data via email

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - SheetJS is industry standard, widely documented
- Architecture: HIGH - Follows existing codebase patterns
- Pitfalls: HIGH - Well-documented Excel parsing issues
- Excel format: LOW - Need sample file from Shane

**Research date:** 2026-02-02
**Valid until:** 2026-02-16 (fast-moving due to demo deadline)

## Recommended Plan Breakdown

Based on research, suggest splitting into 3 plans:

1. **04-01: Excel Parser Core** (~2 hours)
   - Install xlsx, react-dropzone
   - Create excel-import-mapper.ts with parsing logic
   - Create column alias mapping
   - Add zod validation schema

2. **04-02: Import UI Components** (~3 hours)
   - ExcelImportDropzone component
   - ImportPreviewTable with validation display
   - Business name matching preview
   - ImportProgress component

3. **04-03: Import Hook & Page** (~2 hours)
   - useExcelImport hook with bulk upsert
   - Admin import page at /admin/import
   - Handle targets import (12-month split)
   - Success/error reporting
