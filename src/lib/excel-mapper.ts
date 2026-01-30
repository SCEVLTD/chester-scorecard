/**
 * Excel Mapper
 *
 * Transforms scorecard data into Excel worksheet format for export.
 * Uses excel-builder-vanilla for XLSX generation.
 */
import type { Scorecard } from '@/types/database.types'

/**
 * Excel row data type - can be string, number, or null
 */
export type ExcelCellValue = string | number | null

/**
 * Column definition for Excel export
 */
export interface ExcelColumnDef {
  header: string
  width: number
}

/**
 * Column definitions for scorecard export
 * Matches the order specified in the plan
 */
export const SCORECARD_COLUMNS: ExcelColumnDef[] = [
  { header: 'Month', width: 12 },
  { header: 'Consultant Name', width: 20 },
  { header: 'Total Score', width: 12 },
  { header: 'RAG Status', width: 12 },
  // Financial
  { header: 'Revenue Variance (%)', width: 18 },
  { header: 'GP Variance (%)', width: 15 },
  { header: 'Overheads Variance (%)', width: 20 },
  { header: 'Net Profit Variance (%)', width: 20 },
  // People
  { header: 'Productivity Benchmark', width: 22 },
  { header: 'Productivity Actual', width: 18 },
  { header: 'Leadership', width: 15 },
  // Market
  { header: 'Demand', width: 12 },
  { header: 'Marketing', width: 12 },
  // Product
  { header: 'Strength', width: 12 },
  // Suppliers
  { header: 'Supplier Strength', width: 18 },
  // Sales
  { header: 'Execution', width: 12 },
  // Commentary
  { header: 'Biggest Opportunity', width: 40 },
  { header: 'Biggest Risk', width: 40 },
  { header: 'Management Avoiding', width: 40 },
  { header: 'Leadership Confidence', width: 40 },
  { header: 'Gut Feel', width: 40 },
]

/**
 * Transform a scorecard into an Excel row
 *
 * @param scorecard - The scorecard to transform
 * @returns Array of cell values in column order
 */
function scorecardToRow(scorecard: Scorecard): ExcelCellValue[] {
  return [
    scorecard.month,
    scorecard.consultant_name,
    scorecard.total_score,
    scorecard.rag_status,
    // Financial - keep as numbers for Excel
    scorecard.revenue_variance,
    scorecard.gross_profit_variance,
    scorecard.overheads_variance,
    scorecard.net_profit_variance,
    // People
    scorecard.productivity_benchmark,
    scorecard.productivity_actual,
    scorecard.leadership ?? '',
    // Market
    scorecard.market_demand ?? '',
    scorecard.marketing ?? '',
    // Product
    scorecard.product_strength ?? '',
    // Suppliers
    scorecard.supplier_strength ?? '',
    // Sales
    scorecard.sales_execution ?? '',
    // Commentary
    scorecard.biggest_opportunity,
    scorecard.biggest_risk,
    scorecard.management_avoiding,
    scorecard.leadership_confidence,
    scorecard.consultant_gut_feel,
  ]
}

/**
 * Result from mapScorecardsToWorksheet
 */
export interface WorksheetData {
  /** 2D array of data: header row + data rows */
  data: ExcelCellValue[][]
  /** Column definitions with width */
  columns: { width: number }[]
  /** Worksheet name */
  name: string
}

/**
 * Transform an array of scorecards into worksheet data
 *
 * The data is sorted by month ascending (oldest first) for chronological reading.
 * Null values are converted to empty strings for text fields.
 * Numeric values remain as numbers for proper Excel formatting.
 *
 * @param scorecards - Array of scorecards to transform
 * @param businessName - Name of the business for the worksheet name
 * @returns Worksheet data structure ready for excel-builder-vanilla
 */
export function mapScorecardsToWorksheet(
  scorecards: Scorecard[],
  businessName: string
): WorksheetData {
  // Sort by month ascending (oldest first)
  const sorted = [...scorecards].sort((a, b) => a.month.localeCompare(b.month))

  // Build header row
  const headerRow = SCORECARD_COLUMNS.map((col) => col.header)

  // Build data rows
  const dataRows = sorted.map(scorecardToRow)

  // Combine header + data
  const data: ExcelCellValue[][] = [headerRow, ...dataRows]

  // Column widths
  const columns = SCORECARD_COLUMNS.map((col) => ({ width: col.width }))

  // Worksheet name - truncate to 31 chars (Excel limit)
  const name = businessName.slice(0, 31)

  return {
    data,
    columns,
    name,
  }
}
