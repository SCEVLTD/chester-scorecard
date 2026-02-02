/**
 * Excel Template Generator
 *
 * Generates a downloadable Excel template for historical data import
 */
import { utils, write } from 'xlsx'

/**
 * Template headers matching the import schema
 */
const TEMPLATE_HEADERS = [
  'Business Name',
  'Month',
  'Sales',
  'Gross Profit',
  'Overheads',
  'EBITDA',
  'Wages',
  'Sales Target',
  'GP Target',
  'Overheads Target',
  'EBITDA Target',
  'Outbound Calls',
  'First Orders',
]

/**
 * Example data rows to demonstrate the format
 */
const EXAMPLE_DATA = [
  ['Example Company Ltd', '2025-01', 100000, 40000, 20000, 15000, 25000, 110000, 44000, 19000, 18000, 150, 12],
  ['Example Company Ltd', '2025-02', 105000, 42000, 21000, 16000, 26000, 110000, 44000, 19000, 18000, 160, 14],
  ['Another Business', '2025-01', 250000, 100000, 45000, 45000, 60000, 260000, 104000, 44000, 50000, 200, 20],
  ['Another Business', '2025-02', 260000, 104000, 46000, 48000, 62000, 260000, 104000, 44000, 50000, 210, 22],
]

/**
 * Instructions for the template
 */
const INSTRUCTIONS = [
  ['IMPORT TEMPLATE INSTRUCTIONS'],
  [''],
  ['Required Columns:'],
  ['- Business Name: Must match an existing business in the system (case-insensitive)'],
  ['- Month: Use YYYY-MM format (e.g., 2025-01) or "Jan 2025" format'],
  [''],
  ['Optional Columns (include any that apply):'],
  ['- Sales / Revenue / Turnover: Monthly revenue figure'],
  ['- Gross Profit / GP: Monthly gross profit'],
  ['- Overheads / Costs: Monthly overhead costs'],
  ['- EBITDA / Net Profit / Profit: Monthly EBITDA'],
  ['- Wages / Payroll: Monthly wage costs'],
  ['- Sales Target / Revenue Target: Target revenue'],
  ['- GP Target / Gross Profit Target: Target gross profit'],
  ['- Overheads Target: Target overheads'],
  ['- EBITDA Target / Profit Target: Target EBITDA'],
  ['- Outbound Calls / Calls: Number of outbound calls'],
  ['- First Orders / New Accounts: Number of new customers'],
  [''],
  ['Tips:'],
  ['- Delete example rows before importing your data'],
  ['- Business names are matched ignoring "Ltd", "Limited", "PLC", etc.'],
  ['- Leave cells empty for data you do not have'],
  ['- Numbers should not include currency symbols or commas'],
]

/**
 * Generate and download an Excel template file
 */
export function downloadImportTemplate(): void {
  // Create workbook
  const workbook = utils.book_new()

  // Create data sheet with headers and example data
  const dataSheet = utils.aoa_to_sheet([TEMPLATE_HEADERS, ...EXAMPLE_DATA])

  // Set column widths for better readability
  dataSheet['!cols'] = [
    { wch: 25 }, // Business Name
    { wch: 12 }, // Month
    { wch: 12 }, // Sales
    { wch: 12 }, // Gross Profit
    { wch: 12 }, // Overheads
    { wch: 12 }, // EBITDA
    { wch: 12 }, // Wages
    { wch: 14 }, // Sales Target
    { wch: 12 }, // GP Target
    { wch: 16 }, // Overheads Target
    { wch: 14 }, // EBITDA Target
    { wch: 14 }, // Outbound Calls
    { wch: 12 }, // First Orders
  ]

  utils.book_append_sheet(workbook, dataSheet, 'Data')

  // Create instructions sheet
  const instructionsSheet = utils.aoa_to_sheet(INSTRUCTIONS)
  instructionsSheet['!cols'] = [{ wch: 80 }]
  utils.book_append_sheet(workbook, instructionsSheet, 'Instructions')

  // Generate file
  const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' })

  // Create blob and trigger download
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'historical-data-import-template.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
