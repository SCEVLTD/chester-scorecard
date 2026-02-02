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
 * Calculate the financial subtotal from all four variance values
 *
 * @param revenue Revenue variance percentage
 * @param grossProfit Gross profit variance percentage
 * @param overheads Overheads variance percentage
 * @param netProfit Net profit variance percentage
 * @returns Total financial score (0-40)
 */
export function calculateFinancialSubtotal(
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
}

/** Market Demand Index (0-7.5 points) */
export const MARKET_DEMAND_SCORES: Record<string, number> = {
  strong: 7.5,
  flat: 5,
  softening: 2.5,
  decline: 0,
}

/** Marketing Effectiveness Index (0-7.5 points) */
export const MARKETING_SCORES: Record<string, number> = {
  clear: 7.5,
  activity: 5,
  poor: 2.5,
  none: 0,
}

/** Product/Service Strength (0-10 points) */
export const PRODUCT_SCORES: Record<string, number> = {
  differentiated: 10,
  adequate: 6,
  weak: 3,
  broken: 0,
}

/** Suppliers/Purchasing Strength (0-5 points) */
export const SUPPLIER_SCORES: Record<string, number> = {
  strong: 5,
  acceptable: 3,
  weak: 1,
  damaging: 0,
}

/** Sales Execution (0-10 points) */
export const SALES_SCORES: Record<string, number> = {
  beating: 10,
  onTarget: 6,
  underperforming: 3,
  none: 0,
}

// ============================================================================
// QUALITATIVE OPTIONS (for UI RadioGroups)
// ============================================================================

export const LEADERSHIP_OPTIONS = [
  { value: 'aligned', label: 'Fully aligned, accountable leadership', points: 10 },
  { value: 'minor', label: 'Minor issues, not performance limiting', points: 7 },
  { value: 'misaligned', label: 'Clear misalignment affecting output', points: 3 },
  { value: 'toxic', label: 'Toxic / blocking progress', points: 0 },
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

/**
 * Calculate total score from all sections
 *
 * Section breakdown (100 points max):
 * - Financial: 40 points
 * - People/HR: 20 points (productivity 10 + leadership 10)
 * - Market: 15 points (demand 7.5 + marketing 7.5)
 * - Product: 10 points
 * - Suppliers: 5 points
 * - Sales: 10 points
 *
 * @param data Scorecard form data
 * @returns Total score (0-100)
 */
export function calculateTotalScore(data: {
  // Financial (from Phase 2)
  revenueVariance?: number
  grossProfitVariance?: number
  overheadsVariance?: number
  netProfitVariance?: number
  // People/HR
  productivityBenchmark?: number
  productivityActual?: number
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
}): number {
  // Financial subtotal (40 max)
  const financial = calculateFinancialSubtotal(
    Number(data.revenueVariance) || 0,
    Number(data.grossProfitVariance) || 0,
    Number(data.overheadsVariance) || 0,
    Number(data.netProfitVariance) || 0
  )

  // People/HR subtotal (20 max)
  const productivityVariance = calculateProductivityVariance(
    Number(data.productivityBenchmark) || 0,
    Number(data.productivityActual) || 0
  )
  const people =
    scoreProductivity(productivityVariance) +
    (LEADERSHIP_SCORES[data.leadership || ''] ?? 0)

  // Market subtotal (15 max)
  const market =
    (MARKET_DEMAND_SCORES[data.marketDemand || ''] ?? 0) +
    (MARKETING_SCORES[data.marketing || ''] ?? 0)

  // Product (10 max)
  const product = PRODUCT_SCORES[data.productStrength || ''] ?? 0

  // Suppliers (5 max)
  const suppliers = SUPPLIER_SCORES[data.supplierStrength || ''] ?? 0

  // Sales (10 max)
  const sales = SALES_SCORES[data.salesExecution || ''] ?? 0

  return financial + people + market + product + suppliers + sales
}

/**
 * Get RAG (Red/Amber/Green) status from total score
 *
 * Thresholds from Nick's specification:
 * - Green: >= 75
 * - Amber: >= 60
 * - Red: < 60
 *
 * @param score Total score (0-100)
 * @returns RAG status color
 */
export function getRagStatus(score: number): 'green' | 'amber' | 'red' {
  if (score >= 75) return 'green'
  if (score >= 60) return 'amber'
  return 'red'
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
