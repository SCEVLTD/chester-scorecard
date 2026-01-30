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
 */
export function submissionToVariances(submission: CompanySubmission): {
  revenueVariance: number
  grossProfitVariance: number
  overheadsVariance: number
  netProfitVariance: number
  productivityBenchmark: number
  productivityActual: number
} {
  const productivityActual = calculateProductivityActual(
    submission.gross_profit_actual,
    submission.total_wages
  )

  return {
    revenueVariance: calculateVariance(
      submission.revenue_actual,
      submission.revenue_target
    ),
    grossProfitVariance: calculateVariance(
      submission.gross_profit_actual,
      submission.gross_profit_target
    ),
    overheadsVariance: calculateOverheadVariance(
      submission.overheads_actual,
      submission.overheads_budget
    ),
    netProfitVariance: calculateVariance(
      submission.net_profit_actual,
      submission.net_profit_target
    ),
    productivityBenchmark: submission.productivity_benchmark,
    productivityActual: productivityActual,
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
