import { ScoreHeader } from '@/components/score-header'
import { AIAnalysisPanel } from '@/components/ai-analysis-panel'
import { PdfExportButton } from '@/components/pdf-export-button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { calculateSectionScores, SECTION_CONFIG, formatChartMonth } from '@/lib/chart-utils'
import { getScoreColor } from '@/lib/heatmap-utils'
import type { Scorecard } from '@/types/database.types'

interface BusinessScorecardViewProps {
  scorecard: Scorecard
  previousScorecard: Scorecard | null
  businessName: string
}

/**
 * Business Scorecard View Component
 *
 * Consolidated view for individual business scorecard display with:
 * - Prominent score display (large font, color-coded RAG badge)
 * - Section scores overview (quick glance at 6 sections)
 * - AI analysis panel (auto-generates if missing)
 * - PDF export button
 *
 * Used on business detail page for Chester admins to review individual business health.
 * Score visibility and AI insights drive meeting discussions.
 */
export function BusinessScorecardView({
  scorecard,
  previousScorecard,
  businessName,
}: BusinessScorecardViewProps) {
  const sectionScores = calculateSectionScores(scorecard)

  return (
    <div className="space-y-6">
      {/* Top section: Score + Month + PDF Export */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Score display with larger font for prominence */}
          <div className="mb-2">
            <ScoreHeader totalScore={scorecard.total_score} />
          </div>

          {/* Month label */}
          <div className="text-sm text-muted-foreground">
            Scorecard for {formatChartMonth(scorecard.month)}
          </div>
        </div>

        {/* PDF Export button */}
        <div className="shrink-0">
          <PdfExportButton scorecard={scorecard} businessName={businessName} />
        </div>
      </div>

      {/* Section scores overview - quick glance at 6 sections */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
            {Object.entries(SECTION_CONFIG).map(([key, config]) => {
              const score = sectionScores[key as keyof typeof sectionScores]
              const { bg, text } = getScoreColor(score, config.maxScore)
              const percentage = config.maxScore > 0 ? Math.round((score / config.maxScore) * 100) : 0

              return (
                <div key={key} className="flex flex-col items-center gap-2">
                  <span className="text-xs text-muted-foreground">{config.label}</span>
                  <Badge className={`${bg} ${text} font-semibold`}>
                    {score}/{config.maxScore}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{percentage}%</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Panel - auto-generates if missing */}
      <div>
        <AIAnalysisPanel
          scorecard={scorecard}
          previousScorecard={previousScorecard}
          businessName={businessName}
        />
      </div>
    </div>
  )
}
