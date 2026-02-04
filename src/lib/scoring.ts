/**
 * Scoring Functions for Chester Business Scorecard
 *
 * These functions implement Nick's predefined scoring formulas for financial metrics.
 * Source: PROJECT.md scoring specification
 *
 * Financial Performance Section (40 points max):
 * - Revenue vs Target: 0-10 points
 * - Gross Profit vs Target: 0-10 points
 * - Overheads vs Budget: 0-10 points (inverted - under budget is good)
 * - Net Profit vs Target: 0-10 points
 */

/**
 * Score financial metrics where higher variance is better
 * (Revenue, Gross Profit, Net Profit vs Target)
 *
 * Formula from Nick's spec:
 * - >= +10% = 10 points
 * - +5% to +9% = 8 points
 * - -4% to +4% = 6 points
 * - -9% to -5% = 3 points
 * - <= -10% = 0 points
 *
 * @param variancePercent The percentage variance from target (-100 to +100)
 * @returns Score from 0-10
 */
export function scoreFinancialMetric(variancePercent: number): number {
  if (isNaN(variancePercent)) return 0

  if (variancePercent >= 10) return 10
  if (variancePercent >= 5) return 8
  if (variancePercent >= -4) return 6
  if (variancePercent >= -9) return 3
  return 0
}

/**
 * Score overheads where lower variance is better
 * (Overheads vs Budget - being under budget is good)
 *
 * Formula from Nick's spec (inverted):
 * - <= -10% (10%+ under budget) = 10 points
 * - -9% to -5% (5-9% under budget) = 8 points
 * - -4% to +4% (on target) = 6 points
 * - +5% to +9% (5-9% over budget) = 3 points
 * - >= +10% (10%+ over budget) = 0 points
 *
 * @param variancePercent The percentage variance from budget (-100 to +100)
 * @returns Score from 0-10
 */
export function scoreOverheads(variancePercent: number): number {
  if (isNaN(variancePercent)) return 0

  if (variancePercent <= -10) return 10
  if (variancePercent <= -5) return 8
  if (variancePercent <= 4) return 6
  if (variancePercent <= 9) return 3
  return 0
}

/**
 * Calculate the financial subtotal from variance values
 * Handles null/undefined values for N/A fields
 *
 * @param revenue Revenue variance percentage (null if N/A)
 * @param grossProfit Gross profit variance percentage (null if N/A)
 * @param overheads Overheads variance percentage (null if N/A)
 * @param netProfit Net profit variance percentage (null if N/A)
 * @returns Object with score and max possible score
 */
export function calculateFinancialSubtotal(
  revenue: number | null | undefined,
  grossProfit: number | null | undefined,
  overheads: number | null | undefined,
  netProfit: number | null | undefined
): { score: number; maxScore: number } {
  let score = 0
  let maxScore = 0

  if (revenue != null) {
    score += scoreFinancialMetric(revenue)
    maxScore += 10
  }
  if (grossProfit != null) {
    score += scoreFinancialMetric(grossProfit)
    maxScore += 10
  }
  if (overheads != null) {
    score += scoreOverheads(overheads)
    maxScore += 10
  }
  if (netProfit != null) {
    score += scoreFinancialMetric(netProfit)
    maxScore += 10
  }

  return { score, maxScore }
}

/**
 * Legacy function for backwards compatibility
 * Returns just the score (not max) for existing code that expects a number
 */
export function calculateFinancialSubtotalLegacy(
  revenue: number,
  grossProfit: number,
  overheads: number,
  netProfit: number
): number {
  return (
    scoreFinancialMetric(revenue) +
    scoreFinancialMetric(grossProfit) +
    scoreOverheads(overheads) +
    scoreFinancialMetric(netProfit)
  )
}

// ============================================================================
// QUALITATIVE SCORING (Phase 3)
// ============================================================================

/**
 * Calculate productivity variance from benchmark and actual ratios
 *
 * @param benchmark The benchmark GP/Wages ratio (e.g., 2.0)
 * @param actual The actual GP/Wages ratio achieved (e.g., 2.3)
 * @returns Variance percentage (e.g., 15 for 15% improvement)
 */
export function calculateProductivityVariance(benchmark: number, actual: number): number {
  if (benchmark === 0 || isNaN(benchmark) || isNaN(actual)) return 0
  return ((actual - benchmark) / benchmark) * 100
}

/**
 * Score productivity based on variance from benchmark
 *
 * Different thresholds than financial metrics (+/-15%, +/-5%):
 * - >= +15% = 10 points
 * - +5% to +14% = 8 points
 * - -4% to +4% = 6 points
 * - -5% to -14% = 3 points
 * - <= -15% = 0 points
 *
 * @param variancePercent The productivity variance percentage
 * @returns Score from 0-10
 */
export function scoreProductivity(variancePercent: number): number {
  if (isNaN(variancePercent)) return 0

  if (variancePercent >= 15) return 10
  if (variancePercent >= 5) return 8
  if (variancePercent >= -4) return 6
  if (variancePercent >= -14) return 3
  return 0
}

// ============================================================================
// QUALITATIVE SCORE LOOKUP MAPS
// ============================================================================

/** Leadership / Alignment Index (0-10 points) */
export const LEADERSHIP_SCORES: Record<string, number> = {
  aligned: 10,
  minor: 7,
  misaligned: 3,
  toxic: 0,
  na: 0,
}

/** Market Demand Index (0-7.5 points) */
export const MARKET_DEMAND_SCORES: Record<string, number> = {
  strong: 7.5,
  flat: 5,
  softening: 2.5,
  decline: 0,
  na: 0,
}

/** Marketing Effectiveness Index (0-7.5 points) */
export const MARKETING_SCORES: Record<string, number> = {
  clear: 7.5,
  activity: 5,
  poor: 2.5,
  none: 0,
  na: 0,
}

/** Product/Service Strength (0-10 points) */
export const PRODUCT_SCORES: Record<string, number> = {
  differentiated: 10,
  adequate: 6,
  weak: 3,
  broken: 0,
  na: 0,
}

/** Suppliers/Purchasing Strength (0-5 points) */
export const SUPPLIER_SCORES: Record<string, number> = {
  strong: 5,
  acceptable: 3,
  weak: 1,
  damaging: 0,
  na: 0,
}

/** Sales Execution (0-10 points) */
export const SALES_SCORES: Record<string, number> = {
  beating: 10,
  onTarget: 6,
  underperforming: 3,
  none: 0,
  na: 0,
}

// ============================================================================
// QUALITATIVE OPTIONS (for UI RadioGroups)
// ============================================================================

export const LEADERSHIP_OPTIONS = [
  { value: 'aligned', label: 'Fully aligned, accountable leadership', points: 10 },
  { value: 'minor', label: 'Minor issues, not performance limiting', points: 7 },
  { value: 'misaligned', label: 'Clear misalignment affecting output', points: 3 },
  { value: 'toxic', label: 'Toxic / blocking progress', points: 0 },
  { value: 'na', label: 'N/A - Not applicable to my business', points: 0 },
] as const

export const MARKET_DEMAND_OPTIONS = [
  { value: 'strong', label: 'Strong demand / positive momentum', points: 7.5 },
  { value: 'flat', label: 'Flat / mixed signals', points: 5 },
  { value: 'softening', label: 'Softening / pressure on pricing', points: 2.5 },
  { value: 'decline', label: 'Clear decline', points: 0 },
] as const

export const MARKETING_OPTIONS = [
  { value: 'clear', label: 'Clear strategy, measurable ROI', points: 7.5 },
  { value: 'activity', label: 'Activity but weak focus', points: 5 },
  { value: 'poor', label: 'Poor execution / no traction', points: 2.5 },
  { value: 'none', label: 'No meaningful marketing', points: 0 },
] as const

export const PRODUCT_OPTIONS = [
  { value: 'differentiated', label: 'Differentiated, margin-positive, scalable', points: 10 },
  { value: 'adequate', label: 'Adequate but undifferentiated', points: 6 },
  { value: 'weak', label: 'Weak / price-led / delivery issues', points: 3 },
  { value: 'broken', label: 'Fundamentally broken', points: 0 },
] as const

export const SUPPLIER_OPTIONS = [
  { value: 'strong', label: 'Strong suppliers, pricing power', points: 5 },
  { value: 'acceptable', label: 'Acceptable, no leverage', points: 3 },
  { value: 'weak', label: 'Weak suppliers / margin drag', points: 1 },
  { value: 'damaging', label: 'Actively damaging', points: 0 },
] as const

export const SALES_OPTIONS = [
  { value: 'beating', label: 'Beating targets / strong pipeline', points: 10 },
  { value: 'onTarget', label: 'On target / inconsistent performers', points: 6 },
  { value: 'underperforming', label: 'Underperforming / weak management', points: 3 },
  { value: 'none', label: 'No effective sales engine', points: 0 },
] as const

// ============================================================================
// TOTAL SCORE & RAG STATUS
// ============================================================================

export interface ScoreResult {
  score: number
  maxScore: number
  percentage: number
}

/**
 * Calculate total score from all sections with N/A handling
 *
 * Section breakdown (100 points max when all fields present):
 * - Financial: 40 points (Revenue 10, GP 10, Overheads 10, EBITDA 10)
 * - People/HR: 20 points (productivity 10 + leadership 10)
 * - Market: 15 points (demand 7.5 + marketing 7.5)
 * - Product: 10 points
 * - Suppliers: 5 points
 * - Sales: 10 points
 *
 * When fields are N/A, max score is reduced proportionally
 *
 * @param data Scorecard form data
 * @returns Score result with actual score, max possible, and percentage
 */
export function calculateTotalScoreWithMax(data: {
  // Financial (from Phase 2) - null means N/A
  revenueVariance?: number | null
  grossProfitVariance?: number | null
  overheadsVariance?: number | null
  netProfitVariance?: number | null
  // People/HR
  productivityBenchmark?: number | null
  productivityActual?: number | null
  leadership?: string
  // Market
  marketDemand?: string
  marketing?: string
  // Product
  productStrength?: string
  // Suppliers
  supplierStrength?: string
  // Sales
  salesExecution?: string
}): ScoreResult {
  let totalScore = 0
  let totalMaxScore = 0

  // Financial subtotal (up to 40 max)
  const financial = calculateFinancialSubtotal(
    data.revenueVariance,
    data.grossProfitVariance,
    data.overheadsVariance,
    data.netProfitVariance
  )
  totalScore += financial.score
  totalMaxScore += financial.maxScore

  // People/HR subtotal (up to 20 max)
  // Productivity (10 max) - only if benchmark and actual are provided
  if (data.productivityBenchmark != null && data.productivityActual != null) {
    const productivityVariance = calculateProductivityVariance(
      data.productivityBenchmark,
      data.productivityActual
    )
    totalScore += scoreProductivity(productivityVariance)
    totalMaxScore += 10
  }
  // Leadership (10 max) - always included
  totalScore += LEADERSHIP_SCORES[data.leadership || ''] ?? 0
  totalMaxScore += 10

  // Market subtotal (15 max) - always included
  totalScore += MARKET_DEMAND_SCORES[data.marketDemand || ''] ?? 0
  totalMaxScore += 7.5
  totalScore += MARKETING_SCORES[data.marketing || ''] ?? 0
  totalMaxScore += 7.5

  // Product (10 max) - always included
  totalScore += PRODUCT_SCORES[data.productStrength || ''] ?? 0
  totalMaxScore += 10

  // Suppliers (5 max) - always included
  totalScore += SUPPLIER_SCORES[data.supplierStrength || ''] ?? 0
  totalMaxScore += 5

  // Sales (10 max) - always included
  totalScore += SALES_SCORES[data.salesExecution || ''] ?? 0
  totalMaxScore += 10

  const percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0

  return { score: totalScore, maxScore: totalMaxScore, percentage }
}

/**
 * Legacy calculateTotalScore for backwards compatibility
 * Returns just the raw score (not percentage-based)
 */
export function calculateTotalScore(data: {
  revenueVariance?: number | null
  grossProfitVariance?: number | null
  overheadsVariance?: number | null
  netProfitVariance?: number | null
  productivityBenchmark?: number | null
  productivityActual?: number | null
  leadership?: string
  marketDemand?: string
  marketing?: string
  productStrength?: string
  supplierStrength?: string
  salesExecution?: string
}): number {
  const result = calculateTotalScoreWithMax(data)
  // Return the percentage as the "score" for display purposes
  // This ensures N/A fields don't unfairly lower the score
  return Math.round(result.percentage)
}

/**
 * Get RAG (Red/Amber/Green) status from percentage score
 *
 * Thresholds (percentage-based):
 * - Green: >= 75%
 * - Amber: >= 60%
 * - Red: < 60%
 *
 * @param score Percentage score (0-100)
 * @returns RAG status color
 */
export function getRagStatus(score: number): 'green' | 'amber' | 'red' {
  if (score >= 75) return 'green'
  if (score >= 60) return 'amber'
  return 'red'
}

/**
 * Get detailed RAG status with score breakdown
 */
export function getRagStatusWithDetails(data: Parameters<typeof calculateTotalScoreWithMax>[0]): {
  status: 'green' | 'amber' | 'red'
  score: number
  maxScore: number
  percentage: number
} {
  const result = calculateTotalScoreWithMax(data)
  return {
    status: getRagStatus(result.percentage),
    ...result,
  }
}

// ============================================================================
// TREND CALCULATION (Phase 5)
// ============================================================================

export type TrendDirection = 'up' | 'down' | 'same'

export interface TrendData {
  direction: TrendDirection
  change: number // Positive or negative point difference
}

/**
 * Calculate trend from two scores
 *
 * @param currentScore This month's score
 * @param previousScore Last month's score (null if no previous)
 * @returns Trend direction and point change, or null if no comparison available
 */
export function calculateTrend(
  currentScore: number,
  previousScore: number | null
): TrendData | null {
  if (previousScore === null) return null

  const change = currentScore - previousScore

  return {
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same',
    change,
  }
}
