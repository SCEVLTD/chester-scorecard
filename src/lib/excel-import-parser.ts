/**
 * Excel Import Parser
 *
 * Parses Excel/CSV files and maps data to the import schema.
 * Handles column name variations, date formats, and business name matching.
 */
import { read, utils, SSF } from 'xlsx'
import { format, parse } from 'date-fns'
import type { ImportRow } from '@/schemas/import-row'

/**
 * Column alias mapping - maps variations to canonical field names
 * Keys are lowercase for case-insensitive matching
 */
export const COLUMN_ALIASES: Record<string, keyof ImportRow> = {
  // Business identification
  business: 'businessName',
  'business name': 'businessName',
  company: 'businessName',
  'company name': 'businessName',

  // Time period
  month: 'month',
  period: 'month',
  date: 'month',

  // Revenue
  sales: 'revenue',
  revenue: 'revenue',
  turnover: 'revenue',

  // Revenue target
  'sales target': 'revenueTarget',
  'revenue target': 'revenueTarget',
  'budget sales': 'revenueTarget',
  'sales budget': 'revenueTarget',

  // Gross profit
  'gross profit': 'grossProfit',
  gp: 'grossProfit',

  // Gross profit target
  'gp target': 'grossProfitTarget',
  'gross profit target': 'grossProfitTarget',
  'gp budget': 'grossProfitTarget',

  // EBITDA / Net profit
  ebitda: 'ebitda',
  'net profit': 'ebitda',
  ebit: 'ebitda',
  profit: 'ebitda',

  // EBITDA target
  'ebitda target': 'ebitdaTarget',
  'net profit target': 'ebitdaTarget',
  'ebitda budget': 'ebitdaTarget',
  'profit target': 'ebitdaTarget',

  // Overheads
  overheads: 'overheads',
  costs: 'overheads',
  'operating costs': 'overheads',

  // Overheads target
  'overheads budget': 'overheadsTarget',
  'overheads target': 'overheadsTarget',
  'costs budget': 'overheadsTarget',

  // Wages
  wages: 'totalWages',
  'total wages': 'totalWages',
  payroll: 'totalWages',

  // Lead KPIs
  'outbound calls': 'outboundCalls',
  calls: 'outboundCalls',
  'first orders': 'firstOrders',
  'new accounts': 'firstOrders',
  'new customers': 'firstOrders',
}

/**
 * Result from parsing an Excel file
 */
export interface ExcelParseResult {
  rawRows: Record<string, unknown>[]
  headers: string[]
  sheetName: string
  totalSheets: number
}

/**
 * Parse an Excel file and return raw data
 *
 * @param file - File object from input or dropzone
 * @returns Parsed rows and header information
 */
export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = read(arrayBuffer, { cellDates: true })

  // Use first sheet
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  // Convert to JSON array
  const rawRows = utils.sheet_to_json<Record<string, unknown>>(worksheet)

  // Extract headers from first row keys
  const headers = rawRows.length > 0 ? Object.keys(rawRows[0]) : []

  return {
    rawRows,
    headers,
    sheetName,
    totalSheets: workbook.SheetNames.length,
  }
}

/**
 * Normalize a header string for alias matching
 */
function normalizeHeader(header: string): string {
  return header.toLowerCase().trim()
}

/**
 * Map raw Excel columns to schema fields using alias matching
 *
 * @param rawRows - Raw rows from parseExcelFile
 * @param headers - Original headers from the file
 * @returns Rows with canonical field names and list of detected columns
 */
export function mapColumnsToFields(
  rawRows: Record<string, unknown>[],
  headers: string[]
): { mappedRows: Record<string, unknown>[]; detectedColumns: string[] } {
  // Build header mapping: original header -> canonical field name
  const headerMap = new Map<string, keyof ImportRow>()
  const detectedColumns: string[] = []

  for (const header of headers) {
    const normalized = normalizeHeader(header)
    const canonicalField = COLUMN_ALIASES[normalized]
    if (canonicalField) {
      headerMap.set(header, canonicalField)
      detectedColumns.push(`${header} -> ${canonicalField}`)
    }
  }

  // Transform rows
  const mappedRows = rawRows
    .filter((row) => {
      // Skip empty rows
      const values = Object.values(row)
      return values.some((v) => v !== null && v !== undefined && v !== '')
    })
    .map((row) => {
      const mapped: Record<string, unknown> = {}

      for (const [originalHeader, value] of Object.entries(row)) {
        const canonicalField = headerMap.get(originalHeader)
        if (canonicalField) {
          // Special handling for month field
          if (canonicalField === 'month') {
            mapped[canonicalField] = normalizeMonth(value)
          } else {
            mapped[canonicalField] = value
          }
        }
      }

      return mapped
    })

  return { mappedRows, detectedColumns }
}

/**
 * Normalize various date formats to YYYY-MM
 *
 * Handles:
 * - Date objects (from Excel cellDates: true)
 * - "Jan 2021" style strings
 * - "2021-01" already correct format
 * - "01/2021" or "1/2021" format
 * - Numbers (Excel serial dates - rare with cellDates: true)
 *
 * @param value - Raw date value from Excel
 * @returns Normalized YYYY-MM string or original value if unparseable
 */
export function normalizeMonth(value: unknown): string {
  if (!value) return ''

  // Already in correct format
  if (typeof value === 'string') {
    const trimmed = value.trim()

    // Already YYYY-MM
    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      return trimmed
    }

    // Try "Jan 2021", "January 2021" format
    const monthNameMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{4})$/)
    if (monthNameMatch) {
      try {
        const parsed = parse(trimmed, 'MMM yyyy', new Date())
        if (!isNaN(parsed.getTime())) {
          return format(parsed, 'yyyy-MM')
        }
        // Try full month name
        const parsedFull = parse(trimmed, 'MMMM yyyy', new Date())
        if (!isNaN(parsedFull.getTime())) {
          return format(parsedFull, 'yyyy-MM')
        }
      } catch {
        // Fall through to other methods
      }
    }

    // Try "01/2021" or "1/2021" format
    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{4})$/)
    if (slashMatch) {
      const month = slashMatch[1].padStart(2, '0')
      const year = slashMatch[2]
      return `${year}-${month}`
    }

    // Try "2021/01" format
    const reversedSlashMatch = trimmed.match(/^(\d{4})\/(\d{1,2})$/)
    if (reversedSlashMatch) {
      const year = reversedSlashMatch[1]
      const month = reversedSlashMatch[2].padStart(2, '0')
      return `${year}-${month}`
    }
  }

  // Date object (from Excel with cellDates: true)
  if (value instanceof Date) {
    return format(value, 'yyyy-MM')
  }

  // Number (Excel serial date) - rare with cellDates: true
  if (typeof value === 'number') {
    // Excel serial date: days since 1900-01-01 (with off-by-one bug)
    // SheetJS utils can handle this
    try {
      const date = SSF.parse_date_code(value)
      if (date) {
        const month = String(date.m).padStart(2, '0')
        return `${date.y}-${month}`
      }
    } catch {
      // Fall through
    }
  }

  // Return as-is if we can't parse it
  return String(value)
}

/**
 * Normalize a business name for matching
 * Removes common suffixes and normalizes case/whitespace
 */
function normalizeBusinessName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s*(ltd\.?|limited|plc|inc\.?|llc)\s*$/i, '')
    .trim()
}

/**
 * Build a lookup map for business name matching
 */
function buildBusinessLookup(
  businesses: Array<{ id: string; name: string }>
): Map<string, string> {
  const map = new Map<string, string>()
  for (const b of businesses) {
    const normalized = normalizeBusinessName(b.name)
    map.set(normalized, b.id)
  }
  return map
}

/**
 * Match a single business name against the lookup
 */
function matchSingleBusinessName(
  name: string,
  businessMap: Map<string, string>
): string | undefined {
  return businessMap.get(normalizeBusinessName(name))
}

/**
 * Match business names in rows to database IDs
 *
 * @param rows - Validated import rows
 * @param businesses - Array of businesses from database
 * @returns Object with matched rows and list of unmatched business names
 */
export function matchBusinessNames(
  rows: ImportRow[],
  businesses: Array<{ id: string; name: string }>
): {
  matchedRows: Array<ImportRow & { businessId: string }>
  unmatchedRows: Array<{ row: ImportRow; index: number }>
  unmatchedBusinesses: string[]
} {
  const businessMap = buildBusinessLookup(businesses)
  const matchedRows: Array<ImportRow & { businessId: string }> = []
  const unmatchedRows: Array<{ row: ImportRow; index: number }> = []
  const unmatchedBusinessesSet = new Set<string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const businessId = matchSingleBusinessName(row.businessName, businessMap)

    if (businessId) {
      matchedRows.push({ ...row, businessId })
    } else {
      unmatchedRows.push({ row, index: i })
      unmatchedBusinessesSet.add(row.businessName)
    }
  }

  return {
    matchedRows,
    unmatchedRows,
    unmatchedBusinesses: Array.from(unmatchedBusinessesSet),
  }
}
