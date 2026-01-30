import { z } from 'zod'

/**
 * Schema for validating portfolio AI analysis responses from the Edge Function
 *
 * Used to ensure the Edge Function returns data in the expected format.
 * If validation fails, a clear error is thrown instead of silently
 * accepting malformed data.
 */

const attentionPrioritySchema = z.object({
  businessName: z.string(),
  reason: z.string(),
  urgency: z.enum(['immediate', 'soon', 'monitor']),
})

export const portfolioAnalysisSchema = z.object({
  /** Executive summary of portfolio health (150-250 words) */
  portfolioSummary: z.string(),
  /** Common patterns across multiple businesses (3-5 themes) */
  commonThemes: z.array(z.string()),
  /** Businesses ranked by urgency of intervention needed */
  attentionPriorities: z.array(attentionPrioritySchema),
  /** Portfolio-level actionable advice (3-5 items) */
  strategicRecommendations: z.array(z.string()),
  /** Optional sector-specific insights */
  sectorInsights: z.array(z.string()).optional(),
  /** ISO timestamp when analysis was generated */
  generatedAt: z.string(),
  /** Claude model used for generation */
  modelUsed: z.string(),
})

export type PortfolioAnalysis = z.infer<typeof portfolioAnalysisSchema>

/**
 * Validate and parse portfolio analysis response
 * Returns validated data or throws with clear error message
 */
export function parsePortfolioAnalysis(data: unknown): PortfolioAnalysis {
  const result = portfolioAnalysisSchema.safeParse(data)
  if (result.success) {
    return result.data
  }

  // Log the validation errors for debugging
  console.error('[Portfolio Analysis] Validation failed:', result.error.format())

  throw new Error(
    'Portfolio analysis response had unexpected format. Please try generating again.'
  )
}
