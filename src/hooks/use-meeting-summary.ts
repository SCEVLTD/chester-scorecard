import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { parseMeetingSummary, type MeetingSummary } from '@/schemas/meeting-summary'
import type { PortfolioAggregate } from '@/lib/portfolio-aggregator'

interface GenerateMeetingSummaryParams {
  aggregatedData: PortfolioAggregate
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
 * const summary = await generateMeetingSummary.mutateAsync({ aggregatedData })
 * ```
 */
export function useGenerateMeetingSummary() {
  return useMutation({
    mutationFn: async ({ aggregatedData }: GenerateMeetingSummaryParams): Promise<MeetingSummary> => {
      const { data, error } = await supabase.functions.invoke('generate-meeting-summary', {
        body: { aggregatedData },
      })
      if (error) throw new Error(error.message || 'Failed to generate meeting summary')
      return parseMeetingSummary(data)
    },
  })
}
