import { z } from 'zod'

/**
 * Import row schema - validates parsed Excel rows
 * All financial fields are optional because:
 * - Historical sales data may not have EBITDA
 * - Historical EBITDA data may not have sales
 * - Targets may be annual (divided by 12 later)
 */
export const importRowSchema = z.object({
  // Required: business identification
  businessName: z.string().min(1, 'Business name is required'),

  // Required: time period
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM format'),

  // Financial actuals (optional - may not have all data)
  revenue: z.coerce.number().optional(),
  grossProfit: z.coerce.number().optional(),
  overheads: z.coerce.number().optional(),
  ebitda: z.coerce.number().optional(),
  totalWages: z.coerce.number().optional(),

  // Financial targets (optional - may not exist for historical)
  revenueTarget: z.coerce.number().optional(),
  grossProfitTarget: z.coerce.number().optional(),
  overheadsTarget: z.coerce.number().optional(),
  ebitdaTarget: z.coerce.number().optional(),

  // Lead KPIs (optional)
  outboundCalls: z.coerce.number().optional(),
  firstOrders: z.coerce.number().optional(),
})

export type ImportRow = z.infer<typeof importRowSchema>

/**
 * Validated row with matched business ID
 */
export interface ValidatedImportRow extends ImportRow {
  businessId: string // UUID after matching
  isValid: boolean
  errors: string[]
}

/**
 * Parse result summary
 */
export interface ParseResult {
  validRows: ValidatedImportRow[]
  invalidRows: Array<{
    rowNumber: number
    data: Record<string, unknown>
    errors: string[]
  }>
  unmatchedBusinesses: string[]
  detectedColumns: string[]
}
