import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { parsePortfolioAnalysis, type PortfolioAnalysis } from '@/schemas/portfolio-analysis'
import { aggregatePortfolio } from '@/lib/portfolio-aggregator'
import type { PortfolioSummary } from '@/hooks/use-portfolio-summary'
import type { Scorecard } from '@/types/database.types'

interface GeneratePortfolioAnalysisParams {
  portfolioSummary: PortfolioSummary[]
  scorecards: Map<string, Scorecard>
}

/**
 * Mutation hook for generating portfolio-level AI analysis via Edge Function.
 *
 * Pre-aggregates portfolio data client-side to minimize tokens, then calls
 * the generate-portfolio-analysis Edge Function. Response is validated
 * with Zod schema and checked for hallucinated business names.
 *
 * Note: Analysis is NOT persisted to database - generated on demand.
 *
 * Usage:
 * ```tsx
 * const generateAnalysis = useGeneratePortfolioAnalysis()
 *
 * // Trigger generation
 * generateAnalysis.mutate({
 *   portfolioSummary,
 *   scorecards: new Map(businesses.map(b => [b.id, b.scorecard])),
 * })
 *
 * // Check state
 * if (generateAnalysis.isPending) { ... }
 * if (generateAnalysis.isError) { ... }
 * if (generateAnalysis.isSuccess) { const analysis = generateAnalysis.data }
 * ```
 */
export function useGeneratePortfolioAnalysis() {
  return useMutation({
    mutationFn: async ({
      portfolioSummary,
      scorecards,
    }: GeneratePortfolioAnalysisParams): Promise<PortfolioAnalysis> => {
      // Limit to 20 businesses to prevent timeouts
      const limited = portfolioSummary.slice(0, 20)

      // Pre-aggregate data to minimize tokens (~3KB vs ~40KB raw)
      const aggregate = aggregatePortfolio(limited, scorecards)

      // Call Edge Function to generate analysis
      const { data, error } = await supabase.functions.invoke('generate-portfolio-analysis', {
        body: { aggregate },
      })

      if (error) {
        throw new Error(error.message || 'Failed to generate portfolio analysis')
      }

      // Validate response structure with Zod schema
      const analysis = parsePortfolioAnalysis(data)

      // Validate business names (hallucination check)
      // Log warning but don't throw - analysis may still be useful
      const validNames = new Set(aggregate.businesses.map(b => b.name))
      for (const priority of analysis.attentionPriorities) {
        if (!validNames.has(priority.businessName)) {
          console.warn(
            `[Portfolio Analysis] AI mentioned unknown business: "${priority.businessName}". ` +
            `Valid names: ${[...validNames].join(', ')}`
          )
        }
      }

      return analysis
    },
    // No onSuccess cache invalidation - analysis is not persisted to DB
  })
}
