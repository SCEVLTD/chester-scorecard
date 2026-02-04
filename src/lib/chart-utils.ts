/**
 * Chart Utilities for Chester Business Scorecard
 *
 * Provides section score calculation and chart configuration for Recharts.
 * Section scores are NOT stored in the database - they must be calculated
 * from individual scorecard fields using the scoring functions.
 */

import type { ChartConfig } from '@/components/ui/chart'
import type { Scorecard } from '@/types/database.types'
import {
  calculateFinancialSubtotal,
  calculateProductivityVariance,
  scoreProductivity,
  LEADERSHIP_SCORES,
  MARKET_DEMAND_SCORES,
  MARKETING_SCORES,
  PRODUCT_SCORES,
  SUPPLIER_SCORES,
  SALES_SCORES,
} from '@/lib/scoring'

/**
 * Section configuration with colors and labels for charts.
 *
 * Max scores per section:
 * - Financial: 40 (4 x 10 point metrics)
 * - People: 20 (productivity 10 + leadership 10)
 * - Market: 15 (demand 7.5 + marketing 7.5)
 * - Product: 10
 * - Suppliers: 5
 * - Sales: 10
 */
export const SECTION_CONFIG = {
  financial: {
    label: 'Financial',
    color: 'hsl(var(--chart-1))',
    maxScore: 40,
  },
  people: {
    label: 'People',
    color: 'hsl(var(--chart-2))',
    maxScore: 20,
  },
  market: {
    label: 'Market',
    color: 'hsl(var(--chart-3))',
    maxScore: 15,
  },
  product: {
    label: 'Product',
    color: 'hsl(var(--chart-4))',
    maxScore: 10,
  },
  suppliers: {
    label: 'Suppliers',
    color: 'hsl(var(--chart-5))',
    maxScore: 5,
  },
  sales: {
    label: 'Sales',
    color: 'hsl(var(--chart-6))',
    maxScore: 10,
  },
} satisfies ChartConfig & Record<string, { maxScore: number }>

/**
 * Section scores calculated from a scorecard
 */
export interface SectionScores {
  financial: number
  people: number
  market: number
  product: number
  suppliers: number
  sales: number
}

/**
 * Calculate section scores from a scorecard.
 *
 * Uses the same scoring logic as calculateTotalScore in scoring.ts,
 * but returns individual section subtotals for charting.
 *
 * @param scorecard The scorecard to calculate section scores from
 * @returns Object with scores for each of the 6 sections
 */
export function calculateSectionScores(scorecard: Scorecard): SectionScores {
  // Financial subtotal (40 max)
  const financial = calculateFinancialSubtotal(
    Number(scorecard.revenue_variance) || 0,
    Number(scorecard.gross_profit_variance) || 0,
    Number(scorecard.overheads_variance) || 0,
    Number(scorecard.net_profit_variance) || 0
  )

  // People/HR subtotal (20 max)
  const productivityVariance = calculateProductivityVariance(
    Number(scorecard.productivity_benchmark) || 0,
    Number(scorecard.productivity_actual) || 0
  )
  const people =
    scoreProductivity(productivityVariance) +
    (LEADERSHIP_SCORES[scorecard.leadership || ''] ?? 0)

  // Market subtotal (15 max)
  const market =
    (MARKET_DEMAND_SCORES[scorecard.market_demand || ''] ?? 0) +
    (MARKETING_SCORES[scorecard.marketing || ''] ?? 0)

  // Product (10 max)
  const product = PRODUCT_SCORES[scorecard.product_strength || ''] ?? 0

  // Suppliers (5 max)
  const suppliers = SUPPLIER_SCORES[scorecard.supplier_strength || ''] ?? 0

  // Sales (10 max)
  const sales = SALES_SCORES[scorecard.sales_execution || ''] ?? 0

  return { financial: financial.score, people, market, product, suppliers, sales }
}

/**
 * Format month string for chart display.
 *
 * Converts database month format (YYYY-MM) to human-readable format (Jan 2026).
 *
 * @param month Month string in format "YYYY-MM" (e.g., "2026-01")
 * @returns Formatted month string (e.g., "Jan 2026")
 */
export function formatChartMonth(month: string): string {
  // Append -01 to create a valid date string
  const date = new Date(month + '-01')
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}
