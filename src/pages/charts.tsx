/**
 * Charts Page
 *
 * Displays all chart visualizations for a business's scorecard history.
 * Implements TRND-01 through TRND-04 requirements.
 */

import { useParams, useLocation } from 'wouter'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { useBusinesses } from '@/hooks/use-businesses'
import { useBusinessScorecards } from '@/hooks/use-scorecards'
import { useChartData } from '@/hooks/use-chart-data'
import { useChartFilters } from '@/hooks/use-chart-filters'
import { SECTION_CONFIG } from '@/lib/chart-utils'
import { ScoreTrendChart } from '@/components/charts/score-trend-chart'
import { SectionBreakdownChart } from '@/components/charts/section-breakdown-chart'
import { SectionComparisonChart } from '@/components/charts/section-comparison-chart'
import { ChartTimeFilter } from '@/components/charts/chart-time-filter'

const SECTION_KEYS = Object.keys(SECTION_CONFIG)

export function ChartsPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const [, navigate] = useLocation()
  const { data: businesses } = useBusinesses()
  const { data: scorecards, isLoading } = useBusinessScorecards(businessId!)
  const { filters, setFilters } = useChartFilters()
  const chartData = useChartData(scorecards, filters.months)

  const business = businesses?.find((b) => b.id === businessId)
  const latestMonth = chartData[chartData.length - 1] // Most recent after sort

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate(`/business/${businessId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to History
            </Button>
          </div>
          <p className="text-muted-foreground">Loading charts...</p>
        </div>
      </div>
    )
  }

  if (!chartData.length) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(`/business/${businessId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to History
            </Button>
          </div>
          <p className="text-muted-foreground">
            No scorecard data available for charts. Create at least one
            scorecard first.
          </p>
        </div>
      </div>
    )
  }

  // Section toggle handler for comparison chart
  const handleSectionToggle = (section: string) => {
    const current =
      filters.sections.length === 0 ? SECTION_KEYS : filters.sections
    const updated = current.includes(section)
      ? current.filter((s) => s !== section)
      : [...current, section]
    // If all sections selected, clear filter (show all)
    setFilters({
      sections: updated.length === SECTION_KEYS.length ? [] : updated,
    })
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <PageHeader
          backTo={`/business/${businessId}`}
          backText="Back to History"
          showTagline={false}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {business?.name || 'Business'} Charts
            </h1>
            <p className="text-muted-foreground">
              Score trends and section analysis
            </p>
          </div>
          <ChartTimeFilter
            value={filters.months}
            onChange={(months) => setFilters({ months })}
          />
        </div>

        {/* Score Trend Chart (TRND-01) */}
        <Card>
          <CardHeader>
            <CardTitle>Score Trend</CardTitle>
            <CardDescription>Total score trajectory over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ScoreTrendChart data={chartData} />
          </CardContent>
        </Card>

        {/* Section Breakdown Chart (TRND-02) */}
        <Card>
          <CardHeader>
            <CardTitle>Section Breakdown</CardTitle>
            <CardDescription>
              Score by section for {latestMonth?.month || 'latest month'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SectionBreakdownChart data={latestMonth} />
          </CardContent>
        </Card>

        {/* Section Comparison Chart (TRND-04) */}
        <Card>
          <CardHeader>
            <CardTitle>Section Comparison</CardTitle>
            <CardDescription>
              Compare section performance over time (as % of max score)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Section toggles */}
            <div className="flex flex-wrap gap-2 mb-4">
              {SECTION_KEYS.map((section) => {
                const config =
                  SECTION_CONFIG[section as keyof typeof SECTION_CONFIG]
                const isActive =
                  filters.sections.length === 0 ||
                  filters.sections.includes(section)
                return (
                  <Button
                    key={section}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSectionToggle(section)}
                    aria-pressed={isActive}
                  >
                    {config.label}
                  </Button>
                )
              })}
            </div>
            <SectionComparisonChart
              data={chartData}
              sections={filters.sections}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
