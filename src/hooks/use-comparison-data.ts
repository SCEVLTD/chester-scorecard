import { useQueries } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Scorecard } from '@/types/database.types'

interface ComparisonResult {
  data: (Scorecard[] | undefined)[] // Array of scorecard arrays, one per business
  isLoading: boolean
  isError: boolean
}

/**
 * Hook for fetching scorecard data for multiple businesses in parallel
 *
 * Uses TanStack Query's useQueries for efficient parallel fetching.
 * Returns the last 12 months of scorecards for each selected business.
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, isError } = useComparisonData(['id1', 'id2', 'id3'])
 * // data[0] = scorecards for id1, data[1] = scorecards for id2, etc.
 * ```
 */
export function useComparisonData(businessIds: string[]): ComparisonResult {
  const results = useQueries({
    queries: businessIds.map((id) => ({
      queryKey: ['scorecards', id],
      queryFn: async (): Promise<Scorecard[]> => {
        const { data, error } = await supabase
          .from('scorecards')
          .select('*')
          .eq('business_id', id)
          .order('month', { ascending: false })
          .limit(12) // Last 12 months for comparison
        if (error) throw error
        return data as Scorecard[]
      },
      enabled: !!id,
    })),
    combine: (results) => ({
      data: results.map((r) => r.data),
      isLoading: results.some((r) => r.isLoading),
      isError: results.some((r) => r.isError),
    }),
  })

  return results
}
