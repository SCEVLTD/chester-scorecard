/**
 * URL-based Chart Filter State Hook
 *
 * Persists chart filter state (time range, selected sections) in URL parameters.
 * Uses wouter's useSearch and useLocation hooks for URL manipulation.
 *
 * URL format: ?months=3&section=financial&section=people
 * Default is 12 months (omitted from URL to keep it clean).
 */

import { useSearch, useLocation } from 'wouter'
import { useCallback, useMemo } from 'react'

export type TimeRange = '3' | '6' | '12' | 'all'

export interface ChartFilters {
  /** Number of months to display (default: 12) */
  months: TimeRange
  /** Selected sections to highlight/filter (empty = all) */
  sections: string[]
}

/**
 * Hook for managing chart filter state via URL parameters.
 *
 * @returns Current filters and setter function
 *
 * @example
 * ```tsx
 * const { filters, setFilters } = useChartFilters()
 *
 * // Read current time range
 * console.log(filters.months) // '3' | '6' | '12' | 'all'
 *
 * // Change time range
 * setFilters({ months: '6' })
 *
 * // Set multiple sections
 * setFilters({ sections: ['financial', 'people'] })
 * ```
 */
export function useChartFilters() {
  const searchString = useSearch()
  const [, setLocation] = useLocation()

  const filters = useMemo((): ChartFilters => {
    const params = new URLSearchParams(searchString)
    return {
      months: (params.get('months') as TimeRange) || '12',
      sections: params.getAll('section'),
    }
  }, [searchString])

  const setFilters = useCallback(
    (newFilters: Partial<ChartFilters>) => {
      const params = new URLSearchParams(searchString)

      if (newFilters.months !== undefined) {
        if (newFilters.months === '12') {
          // Default value, don't clutter URL
          params.delete('months')
        } else {
          params.set('months', newFilters.months)
        }
      }

      if (newFilters.sections !== undefined) {
        // Clear existing sections and add new ones
        params.delete('section')
        newFilters.sections.forEach((s) => params.append('section', s))
      }

      const query = params.toString()
      setLocation(window.location.pathname + (query ? `?${query}` : ''), {
        replace: true,
      })
    },
    [searchString, setLocation]
  )

  return { filters, setFilters }
}
