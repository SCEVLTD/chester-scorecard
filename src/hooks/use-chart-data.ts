/**
 * Chart Data Transformation Hook
 *
 * Transforms scorecard data into chart-ready format with memoization.
 * Handles time filtering and section score calculation.
 *
 * CRITICAL: Uses useMemo to prevent re-render storms that cause chart flickering.
 */

import { useMemo } from 'react'
import type { Scorecard } from '@/types/database.types'
import { calculateSectionScores, formatChartMonth } from '@/lib/chart-utils'
import type { TimeRange } from './use-chart-filters'

/**
 * Single data point for charts
 */
export interface ChartDataPoint {
  /** Formatted month for display (e.g., "Jan 2026") */
  month: string
  /** Raw month for filtering (e.g., "2026-01") */
  monthRaw: string
  /** Total score from database (0-100) */
  totalScore: number
  /** Financial section score (0-40) */
  financial: number
  /** People section score (0-20) */
  people: number
  /** Market section score (0-15) */
  market: number
  /** Product section score (0-10) */
  product: number
  /** Suppliers section score (0-5) */
  suppliers: number
  /** Sales section score (0-10) */
  sales: number
}

/**
 * Hook to transform scorecard data into chart-ready format.
 *
 * @param scorecards Array of scorecards from database
 * @param timeRange Time filter ('3', '6', '12', or 'all')
 * @returns Memoized array of ChartDataPoint sorted chronologically
 *
 * @example
 * ```tsx
 * const { data: scorecards } = useBusinessScorecards(businessId)
 * const { filters } = useChartFilters()
 * const chartData = useChartData(scorecards, filters.months)
 *
 * // chartData is ready for Recharts
 * <LineChart data={chartData}>
 *   <Line dataKey="totalScore" />
 * </LineChart>
 * ```
 */
export function useChartData(
  scorecards: Scorecard[] | undefined,
  timeRange: TimeRange = '12'
): ChartDataPoint[] {
  return useMemo(() => {
    if (!scorecards?.length) return []

    // Filter by time range
    let filtered = scorecards
    if (timeRange !== 'all') {
      const cutoff = new Date()
      cutoff.setMonth(cutoff.getMonth() - parseInt(timeRange))
      // Format as YYYY-MM for string comparison
      const cutoffStr = cutoff.toISOString().slice(0, 7)
      filtered = scorecards.filter((sc) => sc.month >= cutoffStr)
    }

    // Sort ascending for left-to-right chronological order
    return [...filtered]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((sc) => {
        const sections = calculateSectionScores(sc)
        return {
          month: formatChartMonth(sc.month),
          monthRaw: sc.month,
          totalScore: sc.total_score,
          ...sections,
        }
      })
  }, [scorecards, timeRange])
}
