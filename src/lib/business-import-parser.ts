/**
 * Business Import Parser
 *
 * Parses Excel/CSV files containing business data for bulk import.
 * Extracts company name, contact email, and contact name from spreadsheet.
 */
import { read, utils } from 'xlsx'

export interface BusinessImportRow {
  companyName: string
  contactEmail: string | null
  contactName: string | null
}

/**
 * Column alias mapping - maps variations to canonical field names
 * Keys are lowercase for case-insensitive matching
 */
export const BUSINESS_COLUMN_ALIASES: Record<string, keyof BusinessImportRow> = {
  // Company name variations
  'company': 'companyName',
  'company name': 'companyName',
  'business': 'companyName',
  'business name': 'companyName',
  'name': 'companyName',
  'organisation': 'companyName',
  'organization': 'companyName',

  // Email variations
  'email': 'contactEmail',
  'contact email': 'contactEmail',
  'e-mail': 'contactEmail',
  'email address': 'contactEmail',
  'contact e-mail': 'contactEmail',

  // Contact name variations
  'contact': 'contactName',
  'contact name': 'contactName',
  'person': 'contactName',
  'name': 'contactName',
  'contact person': 'contactName',
}

/**
 * Normalize a header string for alias matching
 */
function normalizeHeader(header: string): string {
  return header.toLowerCase().trim()
}

/**
 * Parse a business spreadsheet and extract company data
 *
 * @param file - File object from input or dropzone
 * @returns Parsed rows, detected columns, and errors
 */
export async function parseBusinessSpreadsheet(file: File): Promise<{
  rows: BusinessImportRow[]
  detectedColumns: string[]
  errors: string[]
}> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = read(arrayBuffer, { cellDates: false })

  // Use first sheet
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  // Convert to JSON array
  const rawRows = utils.sheet_to_json<Record<string, unknown>>(worksheet)

  if (rawRows.length === 0) {
    return {
      rows: [],
      detectedColumns: [],
      errors: ['Spreadsheet is empty'],
    }
  }

  // Extract headers from first row keys
  const headers = Object.keys(rawRows[0])

  // Build header mapping: original header -> canonical field name
  const headerMap = new Map<string, keyof BusinessImportRow>()
  const detectedColumns: string[] = []

  for (const header of headers) {
    const normalized = normalizeHeader(header)
    const canonicalField = BUSINESS_COLUMN_ALIASES[normalized]
    if (canonicalField) {
      headerMap.set(header, canonicalField)
      detectedColumns.push(`${header} -> ${canonicalField}`)
    }
  }

  // Check if companyName column was detected
  const hasCompanyName = Array.from(headerMap.values()).includes('companyName')
  if (!hasCompanyName) {
    return {
      rows: [],
      detectedColumns,
      errors: ['No company name column found. Expected one of: Company, Business, Company Name, Business Name, Name'],
    }
  }

  // Parse rows
  const parsedRows: BusinessImportRow[] = []
  const errors: string[] = []

  for (let i = 0; i < rawRows.length; i++) {
    const rawRow = rawRows[i]
    const rowNumber = i + 2 // +1 for 0-index, +1 for header row

    const mapped: Partial<BusinessImportRow> = {}

    // Map columns using headerMap
    for (const [originalHeader, value] of Object.entries(rawRow)) {
      const canonicalField = headerMap.get(originalHeader)
      if (canonicalField) {
        // Convert value to string and trim
        const stringValue = value != null ? String(value).trim() : ''
        mapped[canonicalField] = stringValue || null
      }
    }

    // Validate required field
    if (!mapped.companyName || mapped.companyName.trim() === '') {
      errors.push(`Row ${rowNumber}: Missing company name`)
      continue
    }

    parsedRows.push({
      companyName: mapped.companyName,
      contactEmail: mapped.contactEmail || null,
      contactName: mapped.contactName || null,
    })
  }

  return {
    rows: parsedRows,
    detectedColumns,
    errors,
  }
}
