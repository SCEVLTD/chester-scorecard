import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AIAnalysisStorage } from '@/schemas/ai-analysis'
import type { Scorecard } from '@/types/database.types'

interface GenerateAnalysisParams {
  scorecardId: string
  scorecard: Scorecard
  previousScorecard: Scorecard | null
  businessName: string
}

/**
 * Mutation hook for generating AI analysis via Edge Function and saving to database.
 *
 * ALWAYS generates BOTH standard and consultant versions in parallel.
 * The appropriate version is displayed based on user role in AIAnalysisPanel.
 *
 * Storage format:
 * {
 *   standard: { execSummary, topQuestions, actions30Day, ... },
 *   consultant: { execSummary, keyObservations, discussionPoints, ... },
 *   generatedAt: ISO timestamp,
 *   modelUsed: 'claude-sonnet-4-5'
 * }
 */
export function useGenerateAnalysis() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      scorecardId,
      scorecard,
      previousScorecard,
      businessName,
    }: GenerateAnalysisParams): Promise<AIAnalysisStorage> => {
      // Call Edge Function to generate BOTH versions
      const { data, error } = await supabase.functions.invoke('generate-analysis', {
        body: {
          scorecard,
          previousScorecard,
          businessName,
          generateBoth: true, // Always generate both versions
        },
      })

      if (error) {
        throw new Error(error.message || 'Failed to generate AI analysis')
      }

      // The response should be in the new combined format
      const analysis = data as AIAnalysisStorage

      // Persist analysis to database
      const { error: saveError } = await supabase
        .from('scorecards')
        .update({
          ai_analysis: analysis,
          ai_analysis_generated_at: analysis.generatedAt,
        })
        .eq('id', scorecardId)

      if (saveError) {
        throw new Error(saveError.message || 'Failed to save AI analysis')
      }

      return analysis
    },
    onSuccess: (_, variables) => {
      // Invalidate scorecard query to refresh cached data
      queryClient.invalidateQueries({ queryKey: ['scorecard', variables.scorecardId] })
    },
  })
}
