/**
 * Variance calculation utilities
 * Converts raw financial numbers to variance percentages for scoring
 */

import type { CompanySubmission } from '@/types/database.types'

/**
 * Calculate variance percentage from actual vs target
 * Positive = above target (good for revenue/profit)
 */
export function calculateVariance(actual: number, target: number): number {
  if (target === 0) return 0
  return ((actual - target) / target) * 100
}

/**
 * Calculate overhead variance
 * Note: For overheads, under budget is GOOD (negative variance)
 * The scoring function in scoring.ts handles this correctly
 */
export function calculateOverheadVariance(actual: number, budget: number): number {
  if (budget === 0) return 0
  return ((actual - budget) / budget) * 100
}

/**
 * Calculate productivity actual ratio (GP / Wages)
 */
export function calculateProductivityActual(grossProfit: number, wages: number): number {
  if (wages === 0) return 0
  return grossProfit / wages
}

/**
 * Calculate productivity variance percentage
 */
export function calculateProductivityVariance(actualRatio: number, benchmarkRatio: number): number {
  if (benchmarkRatio === 0) return 0
  return ((actualRatio - benchmarkRatio) / benchmarkRatio) * 100
}

/**
 * Convert company submission to scorecard variances
 * This is the main function that bridges company-submitted raw data
 * to the variance percentages used by the scorecard scoring system
 *
 * Returns null for fields marked as N/A so they can be excluded from scoring
 */
export function submissionToVariances(submission: CompanySubmission): {
  revenueVariance: number | null
  grossProfitVariance: number | null
  overheadsVariance: number | null
  netProfitVariance: number | null
  productivityBenchmark: number | null
  productivityActual: number | null
  // N/A flags for scoring system
  revenueNa: boolean
  grossProfitNa: boolean
  overheadsNa: boolean
  wagesNa: boolean
} {
  // Check N/A flags - if set, return null for that metric
  const revenueNa = submission.revenue_na ?? false
  const grossProfitNa = submission.gross_profit_na ?? false
  const overheadsNa = submission.overheads_na ?? false
  const wagesNa = submission.wages_na ?? false

  const productivityActual = wagesNa || grossProfitNa ? null : calculateProductivityActual(
    submission.gross_profit_actual ?? 0,
    submission.total_wages ?? 0
  )

  return {
    revenueVariance: revenueNa ? null : calculateVariance(
      submission.revenue_actual ?? 0,
      submission.revenue_target ?? 0
    ),
    grossProfitVariance: grossProfitNa ? null : calculateVariance(
      submission.gross_profit_actual ?? 0,
      submission.gross_profit_target ?? 0
    ),
    overheadsVariance: overheadsNa ? null : calculateOverheadVariance(
      submission.overheads_actual ?? 0,
      submission.overheads_budget ?? 0
    ),
    netProfitVariance: calculateVariance(
      submission.net_profit_actual ?? 0,
      submission.net_profit_target ?? 0
    ),
    productivityBenchmark: wagesNa ? null : (submission.productivity_benchmark ?? 0),
    productivityActual: productivityActual,
    // Pass through N/A flags for scoring
    revenueNa,
    grossProfitNa,
    overheadsNa,
    wagesNa,
  }
}

/**
 * Format a variance for display
 */
export function formatVariance(variance: number): string {
  const sign = variance >= 0 ? '+' : ''
  return `${sign}${variance.toFixed(1)}%`
}

/**
 * Format currency for display (GBP)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
