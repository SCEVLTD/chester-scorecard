import { z } from 'zod'

/**
 * Schemas for validating AI analysis responses from the Edge Function
 */

// Action item schema (used by standard analysis)
const action30DaySchema = z.object({
  action: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
})

// Strategic recommendation schema (used by consultant analysis)
const strategicRecommendationSchema = z.object({
  recommendation: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
})

// Standard analysis schema (for company and super_admin)
export const standardAnalysisSchema = z.object({
  execSummary: z.string(),
  topQuestions: z.array(z.string()),
  actions30Day: z.array(action30DaySchema),
  inconsistencies: z.array(z.string()),
  trendBreaks: z.array(z.string()),
  historicalContext: z.string().optional(),
  eProfileConsiderations: z.string().optional(),
})

// Consultant analysis schema (strategic, no specific figures)
export const consultantAnalysisSchema = z.object({
  execSummary: z.string(),
  keyObservations: z.array(z.string()),
  discussionPoints: z.array(z.string()),
  strategicRecommendations: z.array(strategicRecommendationSchema),
  redFlags: z.array(z.string()),
  relationshipContext: z.string(),
})

// New combined storage format
export const aiAnalysisStorageSchema = z.object({
  standard: standardAnalysisSchema.optional(),
  consultant: consultantAnalysisSchema.optional(),
  generatedAt: z.string(),
  modelUsed: z.string(),
})

// Legacy format schema (for backwards compatibility)
export const legacyAnalysisSchema = z.object({
  execSummary: z.string(),
  topQuestions: z.array(z.string()),
  actions30Day: z.array(action30DaySchema),
  inconsistencies: z.array(z.string()),
  trendBreaks: z.array(z.string()),
  generatedAt: z.string(),
  modelUsed: z.string(),
  isConsultantView: z.boolean().optional(),
})

// Union schema that accepts either format
export const aiAnalysisSchema = z.union([
  aiAnalysisStorageSchema,
  legacyAnalysisSchema,
])

export type StandardAnalysis = z.infer<typeof standardAnalysisSchema>
export type ConsultantAnalysis = z.infer<typeof consultantAnalysisSchema>
export type AIAnalysisStorage = z.infer<typeof aiAnalysisStorageSchema>
export type LegacyAnalysis = z.infer<typeof legacyAnalysisSchema>
export type AIAnalysis = z.infer<typeof aiAnalysisSchema>

/**
 * Parse standard analysis response from Edge Function
 */
export function parseStandardAnalysis(data: unknown): StandardAnalysis {
  const result = standardAnalysisSchema.safeParse(data)
  if (result.success) {
    return result.data
  }
  console.error('[AI Analysis] Standard validation failed:', result.error.format())
  throw new Error('Standard AI analysis response had unexpected format.')
}

/**
 * Parse consultant analysis response from Edge Function
 */
export function parseConsultantAnalysis(data: unknown): ConsultantAnalysis {
  const result = consultantAnalysisSchema.safeParse(data)
  if (result.success) {
    return result.data
  }
  console.error('[AI Analysis] Consultant validation failed:', result.error.format())
  throw new Error('Consultant AI analysis response had unexpected format.')
}

/**
 * Parse any AI analysis from database (handles both formats)
 */
export function parseAIAnalysis(data: unknown): AIAnalysis {
  const result = aiAnalysisSchema.safeParse(data)
  if (result.success) {
    return result.data
  }
  console.error('[AI Analysis] Validation failed:', result.error.format())
  throw new Error('AI analysis response had unexpected format. Please try generating again.')
}

/**
 * Type guard to check if analysis is new storage format
 */
export function isStorageFormat(analysis: AIAnalysis): analysis is AIAnalysisStorage {
  return 'standard' in analysis || 'consultant' in analysis
}
