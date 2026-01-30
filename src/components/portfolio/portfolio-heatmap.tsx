/**
 * Portfolio Heatmap Component
 *
 * Displays all businesses vs all scorecard sections in a color-coded table.
 * Each cell shows the section score colored by percentage of maximum.
 */

import { SECTION_CONFIG, calculateSectionScores } from '@/lib/chart-utils'
import { getScoreColor } from '@/lib/heatmap-utils'
import { cn } from '@/lib/utils'
import type { Scorecard } from '@/types/database.types'

interface PortfolioHeatmapProps {
  businesses: { id: string; name: string }[]
  scorecards: Map<string, Scorecard | undefined> // businessId -> latest scorecard
}

const sectionKeys = ['financial', 'people', 'market', 'product', 'suppliers', 'sales'] as const

/**
 * Heatmap table showing all businesses x all sections with color-coded scores
 */
export function PortfolioHeatmap({ businesses, scorecards }: PortfolioHeatmapProps) {
  if (businesses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No businesses to display
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2 font-medium min-w-[140px]">Business</th>
            {sectionKeys.map((key) => (
              <th key={key} className="text-center p-2 font-medium min-w-[70px]">
                {SECTION_CONFIG[key].label}
              </th>
            ))}
            <th className="text-center p-2 font-medium min-w-[60px]">Total</th>
          </tr>
        </thead>
        <tbody>
          {businesses.map((business) => {
            const scorecard = scorecards.get(business.id)
            const sectionScores = scorecard ? calculateSectionScores(scorecard) : null

            return (
              <tr
                key={business.id}
                className="border-b hover:bg-muted/50 transition-colors"
              >
                <td className="p-2 font-medium">{business.name}</td>
                {sectionKeys.map((key) => {
                  if (!sectionScores) {
                    return (
                      <td key={key} className="p-2 text-center">
                        <span className="inline-flex items-center justify-center min-w-[32px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">
                          -
                        </span>
                      </td>
                    )
                  }

                  const score = sectionScores[key]
                  const maxScore = SECTION_CONFIG[key].maxScore
                  const colors = getScoreColor(score, maxScore)

                  return (
                    <td key={key} className="p-2 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center justify-center min-w-[32px] px-1.5 py-0.5 rounded font-medium',
                          colors.bg,
                          colors.text
                        )}
                      >
                        {score}
                      </span>
                    </td>
                  )
                })}
                <td className="p-2 text-center">
                  {scorecard ? (
                    <span className="font-bold">{scorecard.total_score}</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
