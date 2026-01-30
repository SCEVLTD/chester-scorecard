import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Scorecard, ScorecardInsert } from '@/types/database.types'

/**
 * Mutation hook for creating a new scorecard
 *
 * CRITICAL: Must chain .select().single() - Supabase insert returns nothing by default.
 *
 * Usage:
 * ```tsx
 * const { mutateAsync, isPending, error } = useCreateScorecard()
 * await mutateAsync(scorecardData)
 * ```
 */
export function useCreateScorecard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (scorecard: ScorecardInsert): Promise<Scorecard> => {
      const { data, error } = await supabase
        .from('scorecards')
        .insert(scorecard)
        .select()
        .single()
      if (error) throw error
      return data as Scorecard
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scorecards', data.business_id] })
      queryClient.invalidateQueries({ queryKey: ['scorecards', 'latest-per-business'] })
    },
  })
}

/**
 * Query hook for fetching all scorecards for a business
 *
 * Returns scorecards ordered by month descending (most recent first).
 *
 * Usage:
 * ```tsx
 * const { data: scorecards, isLoading, error } = useBusinessScorecards(businessId)
 * ```
 */
export function useBusinessScorecards(businessId: string) {
  return useQuery({
    queryKey: ['scorecards', businessId],
    queryFn: async (): Promise<Scorecard[]> => {
      const { data, error } = await supabase
        .from('scorecards')
        .select('*')
        .eq('business_id', businessId)
        .order('month', { ascending: false })
      if (error) throw error
      return data as Scorecard[]
    },
    enabled: !!businessId,
  })
}

/**
 * Query hook for fetching a single scorecard by ID
 *
 * Used for edit mode to load existing scorecard data.
 *
 * Usage:
 * ```tsx
 * const { data: scorecard, isLoading, error } = useScorecard(scorecardId)
 * ```
 */
export function useScorecard(scorecardId: string | undefined) {
  return useQuery({
    queryKey: ['scorecard', scorecardId],
    queryFn: async (): Promise<Scorecard> => {
      const { data, error } = await supabase
        .from('scorecards')
        .select('*')
        .eq('id', scorecardId!)
        .single()
      if (error) throw error
      return data as Scorecard
    },
    enabled: !!scorecardId,
  })
}

/**
 * Mutation hook for updating an existing scorecard
 *
 * Invalidates relevant query caches on success.
 *
 * Usage:
 * ```tsx
 * const { mutateAsync, isPending, error } = useUpdateScorecard()
 * await mutateAsync({ id: scorecardId, ...updates })
 * ```
 */
export function useUpdateScorecard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<ScorecardInsert>): Promise<Scorecard> => {
      const { data, error } = await supabase
        .from('scorecards')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Scorecard
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scorecard', data.id] })
      queryClient.invalidateQueries({ queryKey: ['scorecards', data.business_id] })
      queryClient.invalidateQueries({ queryKey: ['scorecards', 'latest-per-business'] })
    },
  })
}

/**
 * Query hook for fetching the latest scorecard per business
 *
 * Used on home page to show current score/RAG for each business card.
 * Returns a Map of business_id -> { total_score, rag_status, month }
 *
 * Usage:
 * ```tsx
 * const { data: latestScores } = useLatestScoresPerBusiness()
 * const score = latestScores?.get(businessId)
 * ```
 */
export function useLatestScoresPerBusiness() {
  return useQuery({
    queryKey: ['scorecards', 'latest-per-business'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scorecards')
        .select('business_id, total_score, rag_status, month')
        .order('month', { ascending: false })
      if (error) throw error

      // Group by business_id, keep only first (latest) per business
      const latestByBusiness = new Map<string, { total_score: number; rag_status: string; month: string }>()
      for (const scorecard of data) {
        if (!latestByBusiness.has(scorecard.business_id)) {
          latestByBusiness.set(scorecard.business_id, {
            total_score: scorecard.total_score,
            rag_status: scorecard.rag_status,
            month: scorecard.month,
          })
        }
      }
      return latestByBusiness
    },
  })
}
