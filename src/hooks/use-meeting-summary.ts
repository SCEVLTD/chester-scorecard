import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { parseMeetingSummary, type MeetingSummary } from '@/schemas/meeting-summary'
import type { PortfolioAggregate } from '@/lib/portfolio-aggregator'
import type { MeetingType } from '@/types/database.types'

interface GenerateMeetingSummaryParams {
  aggregatedData: PortfolioAggregate
  persist?: boolean
  meetingDate?: string
  meetingType?: MeetingType
  title?: string
}

export interface MeetingSummaryWithId extends MeetingSummary {
  meetingId?: string
}

/**
 * Hook for generating meeting preparation summaries.
 *
 * Invokes the `generate-meeting-summary` Edge Function with aggregated portfolio data.
 * The Edge Function uses Claude to generate anonymized insights for Friday meetings.
 *
 * Usage:
 * ```tsx
 * const generateMeetingSummary = useGenerateMeetingSummary()
 * const aggregatedData = aggregatePortfolio(portfolio, scorecards)
 *
 * // Generate without persisting (legacy behavior)
 * const summary = await generateMeetingSummary.mutateAsync({ aggregatedData })
 *
 * // Generate and persist to database (new Granola-style UX)
 * const summary = await generateMeetingSummary.mutateAsync({
 *   aggregatedData,
 *   persist: true,
 *   meetingType: 'friday_group'
 * })
 * console.log(summary.meetingId) // UUID of saved meeting
 * ```
 */
export function useGenerateMeetingSummary() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      aggregatedData,
      persist,
      meetingDate,
      meetingType,
      title,
    }: GenerateMeetingSummaryParams): Promise<MeetingSummaryWithId> => {
      const { data, error } = await supabase.functions.invoke('generate-meeting-summary', {
        body: { aggregatedData, persist, meetingDate, meetingType, title },
      })
      if (error) throw new Error(error.message || 'Failed to generate meeting summary')

      const parsed = parseMeetingSummary(data) as MeetingSummaryWithId
      if (data.meetingId) {
        parsed.meetingId = data.meetingId
      }
      return parsed
    },
    onSuccess: (data) => {
      // Invalidate meetings queries if we persisted
      if (data.meetingId) {
        queryClient.invalidateQueries({ queryKey: ['meetings'] })
      }
    },
  })
}
