import { z } from 'zod'

/**
 * Variance percentage schema with coercion for form inputs
 *
 * Uses z.coerce.number() for type-safe form integration with react-hook-form.
 * The coercion handles string-to-number conversion automatically.
 *
 * Note: Empty strings coerce to NaN, which fails validation.
 * We use .optional() and handle empty/NaN at the component level.
 */
const variancePercent = z
  .number()
  .min(-100, 'Must be at least -100%')
  .max(100, 'Cannot exceed +100%')
  .optional()

/**
 * Financial Performance section schema (40 points max)
 *
 * All four metrics use variance percentage inputs:
 * - Revenue vs Target
 * - Gross Profit vs Target
 * - Overheads vs Budget (inverted scoring - under budget is good)
 * - Net Profit vs Target
 */
export const financialSchema = z.object({
  revenueVariance: variancePercent,
  grossProfitVariance: variancePercent,
  overheadsVariance: variancePercent,
  netProfitVariance: variancePercent,
})

export type FinancialData = z.infer<typeof financialSchema>

// ============================================================================
// QUALITATIVE FIELD SCHEMAS (Phase 3)
// ============================================================================

/**
 * Ratio input for productivity calculation (GP / Total Wages)
 * User enters benchmark and actual ratios as positive decimals (e.g., 2.5)
 */
const ratioInput = z.number().min(0).optional()

/**
 * Forced-choice enum schemas for qualitative sections
 * Store the string key (e.g., "aligned"), derive numeric score in scoring functions
 * Leadership keeps 'na' option for solo entrepreneurs (one-man bands)
 */
const leadershipChoice = z.enum(['aligned', 'minor', 'misaligned', 'toxic', 'na']).optional()
const marketDemandChoice = z.enum(['strong', 'flat', 'softening', 'decline']).optional()
const marketingChoice = z.enum(['clear', 'activity', 'poor', 'none']).optional()
const productChoice = z.enum(['differentiated', 'adequate', 'weak', 'broken']).optional()
const supplierChoice = z.enum(['strong', 'acceptable', 'weak', 'damaging']).optional()
const salesChoice = z.enum(['beating', 'onTarget', 'underperforming', 'none']).optional()

/**
 * Leadership confidence choice for commentary section
 * This is a user selection, not a scored metric
 */
const leadershipConfidenceChoice = z.enum(['yes', 'maybe', 'no'])

/**
 * Full scorecard form schema
 *
 * Includes:
 * - Setup fields (month, consultant name) from Phase 1
 * - Financial performance fields from Phase 2
 * - People/HR section (Phase 3)
 * - Market & Demand section (Phase 3)
 * - Product/Service section (Phase 3)
 * - Suppliers/Purchasing section (Phase 3)
 * - Sales Execution section (Phase 3)
 */
export const scorecardSchema = z.object({
  // Setup fields (required)
  month: z.string().min(1, 'Please select a month'),
  consultantName: z.string().min(1, 'Consultant name is required'),

  // Financial Performance fields (optional - can be left blank)
  revenueVariance: variancePercent,
  grossProfitVariance: variancePercent,
  overheadsVariance: variancePercent,
  netProfitVariance: variancePercent,

  // People/HR fields (Phase 3) - 20 points max
  productivityBenchmark: ratioInput,
  productivityActual: ratioInput,
  leadership: leadershipChoice,

  // Market & Demand fields (Phase 3) - 15 points max
  marketDemand: marketDemandChoice,
  marketing: marketingChoice,

  // Product/Service Strength (Phase 3) - 10 points max
  productStrength: productChoice,

  // Suppliers/Purchasing (Phase 3) - 5 points max
  supplierStrength: supplierChoice,

  // Sales Execution (Phase 3) - 10 points max
  salesExecution: salesChoice,

  // Commentary Section (Phase 4) - ALL MANDATORY
  // Uses .trim().min(1) to reject empty strings
  biggestOpportunity: z.string().trim().min(1, 'Biggest opportunity is required'),
  biggestRisk: z.string().trim().min(1, 'Biggest risk is required'),
  managementAvoiding: z.string().trim().min(1, 'This field is required'),
  leadershipConfidence: leadershipConfidenceChoice,
  consultantGutFeel: z.string().trim().min(1, 'Gut feel commentary is required'),
})

export type ScorecardData = z.infer<typeof scorecardSchema>
