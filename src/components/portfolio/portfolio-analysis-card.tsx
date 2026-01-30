/**
 * Portfolio Analysis Card Component
 *
 * Displays AI-generated portfolio analysis with all sections:
 * - Executive summary
 * - Common themes
 * - Attention priorities (with urgency badges)
 * - Strategic recommendations
 * - Optional sector insights
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, AlertCircle, TrendingUp, Lightbulb, Users } from 'lucide-react'
import type { PortfolioAnalysis } from '@/schemas/portfolio-analysis'
import { cn } from '@/lib/utils'

interface PortfolioAnalysisCardProps {
  analysis: PortfolioAnalysis
}

const urgencyColors: Record<string, { bg: string; text: string }> = {
  immediate: { bg: 'bg-red-100', text: 'text-red-700' },
  soon: { bg: 'bg-amber-100', text: 'text-amber-700' },
  monitor: { bg: 'bg-gray-100', text: 'text-gray-600' },
}

/**
 * Display component for portfolio-level AI analysis
 */
export function PortfolioAnalysisCard({ analysis }: PortfolioAnalysisCardProps) {
  const generatedDate = new Date(analysis.generatedAt)
  const formattedDate = generatedDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Sort attention priorities by urgency (immediate first)
  const sortedPriorities = [...analysis.attentionPriorities].sort((a, b) => {
    const order = { immediate: 0, soon: 1, monitor: 2 }
    return order[a.urgency] - order[b.urgency]
  })

  return (
    <Card className="border-purple-200 bg-purple-50/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-purple-700">
          <Sparkles className="h-5 w-5" />
          AI Portfolio Analysis
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {formattedDate}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Executive Summary */}
        <section>
          <h3 className="text-base font-semibold mb-2">Executive Summary</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {analysis.portfolioSummary}
          </p>
        </section>

        {/* Common Themes */}
        <section>
          <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Common Themes
          </h3>
          <div className="flex flex-wrap gap-2">
            {analysis.commonThemes.map((theme, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-sm py-1 px-3"
              >
                {theme}
              </Badge>
            ))}
          </div>
        </section>

        {/* Attention Priorities */}
        <section>
          <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            Attention Priorities
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium">Business</th>
                  <th className="text-left py-2 pr-4 font-medium">Reason</th>
                  <th className="text-left py-2 font-medium">Urgency</th>
                </tr>
              </thead>
              <tbody>
                {sortedPriorities.map((priority, index) => {
                  const colors = urgencyColors[priority.urgency]
                  return (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">
                        {priority.businessName}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {priority.reason}
                      </td>
                      <td className="py-2">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                            colors.bg,
                            colors.text
                          )}
                        >
                          {priority.urgency}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Strategic Recommendations */}
        <section>
          <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
            Strategic Recommendations
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            {analysis.strategicRecommendations.map((recommendation, index) => (
              <li key={index} className="leading-relaxed">
                {recommendation}
              </li>
            ))}
          </ol>
        </section>

        {/* Sector Insights (optional) */}
        {analysis.sectorInsights && analysis.sectorInsights.length > 0 && (
          <section>
            <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Sector Insights
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {analysis.sectorInsights.map((insight, index) => (
                <li key={index} className="leading-relaxed">
                  {insight}
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  )
}
