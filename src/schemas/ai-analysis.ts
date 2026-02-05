import { z } from 'zod'

/**
 * Schema for validating AI analysis responses from the Edge Function
 *
 * Used to ensure the Edge Function returns data in the expected format.
 * If validation fails, a clear error is thrown instead of silently
 * accepting malformed data.
 */

const action30DaySchema = z.object({
  action: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
})

export const aiAnalysisSchema = z.object({
  execSummary: z.string(),
  topQuestions: z.array(z.string()),
  actions30Day: z.array(action30DaySchema),
  inconsistencies: z.array(z.string()),
  trendBreaks: z.array(z.string()),
  generatedAt: z.string(),
  modelUsed: z.string(),
  isConsultantView: z.boolean().optional(), // true if generated for consultant role (no specific financial figures)
})

export type AIAnalysis = z.infer<typeof aiAnalysisSchema>

/**
 * Validate and parse AI analysis response
 * Returns validated data or throws with clear error message
 */
export function parseAIAnalysis(data: unknown): AIAnalysis {
  const result = aiAnalysisSchema.safeParse(data)
  if (result.success) {
    return result.data
  }

  // Log the validation errors for debugging
  console.error('[AI Analysis] Validation failed:', result.error.format())

  throw new Error(
    'AI analysis response had unexpected format. Please try generating again.'
  )
}
