/**
 * Heatmap Utilities for Portfolio Visualization
 *
 * Provides score-to-color mapping for the portfolio heatmap view.
 * Uses Tailwind classes for consistent styling across the app.
 */

/**
 * Score thresholds for heatmap coloring (percentage-based)
 * Uses Tailwind classes for consistent styling
 */
export const SCORE_THRESHOLDS = {
  excellent: { min: 80, bg: 'bg-green-500', text: 'text-white' },
  good: { min: 60, bg: 'bg-green-300', text: 'text-green-900' },
  fair: { min: 40, bg: 'bg-amber-400', text: 'text-amber-900' },
  poor: { min: 20, bg: 'bg-orange-400', text: 'text-orange-900' },
  critical: { min: 0, bg: 'bg-red-500', text: 'text-white' },
  empty: { min: -1, bg: 'bg-gray-100', text: 'text-gray-400' },
}

/**
 * Get Tailwind classes for a score cell based on percentage of max
 * @param score The actual score
 * @param maxScore The maximum possible score for this section
 * @returns Object with bg and text Tailwind classes
 */
export function getScoreColor(score: number, maxScore: number): { bg: string; text: string } {
  if (score === 0 && maxScore === 0) return SCORE_THRESHOLDS.empty
  if (maxScore === 0) return SCORE_THRESHOLDS.empty

  const percent = (score / maxScore) * 100

  if (percent >= 80) return SCORE_THRESHOLDS.excellent
  if (percent >= 60) return SCORE_THRESHOLDS.good
  if (percent >= 40) return SCORE_THRESHOLDS.fair
  if (percent >= 20) return SCORE_THRESHOLDS.poor
  return SCORE_THRESHOLDS.critical
}
