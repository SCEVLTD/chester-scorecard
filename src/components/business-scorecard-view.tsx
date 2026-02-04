import { ScoreHeader } from '@/components/score-header'
import { AIAnalysisPanel } from '@/components/ai-analysis-panel'
import { PdfExportButton } from '@/components/pdf-export-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { calculateSectionScores, SECTION_CONFIG, formatChartMonth } from '@/lib/chart-utils'
import { getScoreColor } from '@/lib/heatmap-utils'
import {
  scoreFinancialMetric,
  LEADERSHIP_OPTIONS,
  MARKET_DEMAND_OPTIONS,
  MARKETING_OPTIONS,
  PRODUCT_OPTIONS,
  SUPPLIER_OPTIONS,
  SALES_OPTIONS,
} from '@/lib/scoring'
import type { Scorecard } from '@/types/database.types'

interface BusinessScorecardViewProps {
  scorecard: Scorecard
  previousScorecard: Scorecard | null
  businessName: string
}

// Helper to get label from option value
function getOptionLabel(options: readonly { value: string; label: string; points: number }[], value: string | null): string {
  if (!value) return 'Not set'
  const option = options.find(o => o.value === value)
  return option?.label || value
}

function getOptionPoints(options: readonly { value: string; label: string; points: number }[], value: string | null): number {
  if (!value) return 0
  const option = options.find(o => o.value === value)
  return option?.points || 0
}

/**
 * Business Scorecard View Component (Simplified Version)
 *
 * Shows all submitted data with scores - read-only view.
 * Used for reviewing company self-assessments.
 */
export function BusinessScorecardView({
  scorecard,
  previousScorecard,
  businessName,
}: BusinessScorecardViewProps) {
  const sectionScores = calculateSectionScores(scorecard)

  // Calculate financial scores
  const revenueScore = scorecard.revenue_variance != null ? scoreFinancialMetric(scorecard.revenue_variance) : 0
  const ebitdaScore = scorecard.net_profit_variance != null ? scoreFinancialMetric(scorecard.net_profit_variance) : 0

  return (
    <div className="space-y-6">
      {/* Top section: Score + Month + PDF Export */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-2">
            <ScoreHeader totalScore={scorecard.total_score} />
          </div>
          <div className="text-sm text-muted-foreground">
            Scorecard for {formatChartMonth(scorecard.month)}
          </div>
        </div>
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

      {/* Financial Performance Detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Financial Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="font-medium">Revenue vs Target</p>
              <p className="text-sm text-muted-foreground">
                {scorecard.revenue_variance != null ? `${scorecard.revenue_variance >= 0 ? '+' : ''}${scorecard.revenue_variance.toFixed(1)}%` : 'Not set'}
              </p>
            </div>
            <Badge variant="outline">{revenueScore}/10</Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">EBITDA vs Target</p>
              <p className="text-sm text-muted-foreground">
                {scorecard.net_profit_variance != null ? `${scorecard.net_profit_variance >= 0 ? '+' : ''}${scorecard.net_profit_variance.toFixed(1)}%` : 'Not set'}
              </p>
            </div>
            <Badge variant="outline">{ebitdaScore}/10</Badge>
          </div>
        </CardContent>
      </Card>

      {/* People / HR Detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">People / HR</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Leadership / Alignment</p>
              <p className="text-sm text-muted-foreground">{getOptionLabel(LEADERSHIP_OPTIONS, scorecard.leadership)}</p>
            </div>
            <Badge variant="outline">{getOptionPoints(LEADERSHIP_OPTIONS, scorecard.leadership)}/10</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Market & Demand Detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Market & Demand</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="font-medium">Market Demand</p>
              <p className="text-sm text-muted-foreground">{getOptionLabel(MARKET_DEMAND_OPTIONS, scorecard.market_demand)}</p>
            </div>
            <Badge variant="outline">{getOptionPoints(MARKET_DEMAND_OPTIONS, scorecard.market_demand)}/7.5</Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Marketing Effectiveness</p>
              <p className="text-sm text-muted-foreground">{getOptionLabel(MARKETING_OPTIONS, scorecard.marketing)}</p>
            </div>
            <Badge variant="outline">{getOptionPoints(MARKETING_OPTIONS, scorecard.marketing)}/7.5</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Product/Service Detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Product / Service</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Product Strength</p>
              <p className="text-sm text-muted-foreground">{getOptionLabel(PRODUCT_OPTIONS, scorecard.product_strength)}</p>
            </div>
            <Badge variant="outline">{getOptionPoints(PRODUCT_OPTIONS, scorecard.product_strength)}/10</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Suppliers / Purchasing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Supplier Strength</p>
              <p className="text-sm text-muted-foreground">{getOptionLabel(SUPPLIER_OPTIONS, scorecard.supplier_strength)}</p>
            </div>
            <Badge variant="outline">{getOptionPoints(SUPPLIER_OPTIONS, scorecard.supplier_strength)}/5</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Sales Detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Sales Execution</p>
              <p className="text-sm text-muted-foreground">{getOptionLabel(SALES_OPTIONS, scorecard.sales_execution)}</p>
            </div>
            <Badge variant="outline">{getOptionPoints(SALES_OPTIONS, scorecard.sales_execution)}/10</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Commentary Section */}
      {(scorecard.biggest_opportunity || scorecard.biggest_risk || scorecard.management_avoiding || scorecard.consultant_gut_feel) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Commentary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {scorecard.biggest_opportunity && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Biggest Opportunity</p>
                <p className="mt-1">{scorecard.biggest_opportunity}</p>
              </div>
            )}
            {scorecard.biggest_risk && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Biggest Risk</p>
                <p className="mt-1">{scorecard.biggest_risk}</p>
              </div>
            )}
            {scorecard.management_avoiding && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">What Management is Avoiding</p>
                <p className="mt-1">{scorecard.management_avoiding}</p>
              </div>
            )}
            {scorecard.consultant_gut_feel && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="mt-1">{scorecard.consultant_gut_feel}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
