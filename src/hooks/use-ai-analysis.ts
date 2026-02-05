import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { parseAIAnalysis, type AIAnalysis } from '@/schemas/ai-analysis'
import type { Scorecard } from '@/types/database.types'
import { useAuth } from '@/contexts/auth-context'

interface GenerateAnalysisParams {
  scorecardId: string
  scorecard: Scorecard
  previousScorecard: Scorecard | null
  businessName: string
}

/**
 * Mutation hook for generating AI analysis via Edge Function and saving to database.
 *
 * Calls the generate-analysis Edge Function with scorecard data, then persists
 * the result to the scorecards table. Invalidates cache on success.
 *
 * Usage:
 * ```tsx
 * const generateAnalysis = useGenerateAnalysis()
 *
 * // Trigger generation
 * generateAnalysis.mutate({
 *   scorecardId: scorecard.id,
 *   scorecard,
 *   previousScorecard,
 *   businessName: 'Acme Corp',
 * })
 *
 * // Check state
 * if (generateAnalysis.isPending) { ... }
 * if (generateAnalysis.isError) { ... }
 * if (generateAnalysis.isSuccess) { const analysis = generateAnalysis.data }
 * ```
 */
export function useGenerateAnalysis() {
  const queryClient = useQueryClient()
  const { userRole } = useAuth()

  // Consultants get a strategic view without specific financial figures
  const isConsultant = userRole === 'consultant'

  return useMutation({
    mutationFn: async ({
      scorecardId,
      scorecard,
      previousScorecard,
      businessName,
    }: GenerateAnalysisParams): Promise<AIAnalysis> => {
      // Call Edge Function to generate analysis
      const { data, error } = await supabase.functions.invoke('generate-analysis', {
        body: { scorecard, previousScorecard, businessName, isConsultant },
      })

      if (error) {
        throw new Error(error.message || 'Failed to generate AI analysis')
      }

      // Validate response structure with Zod schema
      const analysis = parseAIAnalysis(data)

      // Add isConsultantView flag to persisted analysis so we can check later
      // if cached analysis matches the viewer's role
      const analysisWithRole = {
        ...analysis,
        isConsultantView: isConsultant,
      }

      // Persist analysis to database
      const { error: saveError } = await supabase
        .from('scorecards')
        .update({
          ai_analysis: analysisWithRole,
          ai_analysis_generated_at: analysisWithRole.generatedAt,
        })
        .eq('id', scorecardId)

      if (saveError) {
        throw new Error(saveError.message || 'Failed to save AI analysis')
      }

      return analysisWithRole
    },
    onSuccess: (_, variables) => {
      // Invalidate scorecard query to refresh cached data
      queryClient.invalidateQueries({ queryKey: ['scorecard', variables.scorecardId] })
    },
  })
}
