import { z } from 'zod'

/**
 * Meeting Summary Schema
 *
 * Defines the structure for AI-generated meeting preparation summaries.
 * These summaries aggregate portfolio insights without identifying individual businesses.
 */
export const meetingSummarySchema = z.object({
  /** Aggregated wins across portfolio (3-5 items) */
  aggregatedWins: z.array(z.string()),
  /** Common challenges faced (3-5 items) */
  commonChallenges: z.array(z.string()),
  /** Discussion points for meeting (5-7 items) */
  discussionPoints: z.array(z.string()),
  /** Recommended group actions (3-5 items) */
  groupActions: z.array(z.string()),
  /** Portfolio health summary (2-3 sentences) */
  healthSummary: z.string(),
  /** ISO timestamp */
  generatedAt: z.string(),
  /** Model used */
  modelUsed: z.string(),
})

export type MeetingSummary = z.infer<typeof meetingSummarySchema>

/**
 * Parse and validate meeting summary response from Edge Function.
 *
 * @param data - Raw response from Edge Function
 * @returns Validated MeetingSummary object
 * @throws Error if validation fails
 */
export function parseMeetingSummary(data: unknown): MeetingSummary {
  const result = meetingSummarySchema.safeParse(data)
  if (result.success) return result.data
  console.error('[Meeting Summary] Validation failed:', result.error.format())
  throw new Error('Meeting summary response had unexpected format.')
}
