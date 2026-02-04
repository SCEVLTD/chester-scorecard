import { useParams, useLocation } from 'wouter'
import { BarChart3, Plus } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useBusinesses } from '@/hooks/use-businesses'
import { useBusinessScorecards } from '@/hooks/use-scorecards'
import { calculateTrend } from '@/lib/scoring'
import { ScorecardHistoryItem } from '@/components/scorecard-history-item'
import { ExcelExportButton } from '@/components/excel-export-button'

/**
 * Business scorecard history page
 *
 * Lists all scorecards for a business with trend indicators.
 * Click on a scorecard to view/edit the submitted data with scores.
 */
export function HistoryPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const [, navigate] = useLocation()
  const { data: businesses } = useBusinesses()
  const { data: scorecards, isLoading } = useBusinessScorecards(businessId!)

  const business = businesses?.find(b => b.id === businessId)

  // Calculate trends for each scorecard (compare to next item in list, which is previous month)
  const scorecardsWithTrend = scorecards?.map((scorecard, index) => ({
    ...scorecard,
    trend: index < scorecards.length - 1
      ? calculateTrend(scorecard.total_score, scorecards[index + 1].total_score)
      : null,
  }))

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <PageHeader backTo="/" backText="Back" showTagline={false} />

        <Card>
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">{business?.name || 'Loading...'}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/business/${businessId}/charts`)}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Charts
              </Button>
              {scorecards && scorecards.length > 0 && business && (
                <ExcelExportButton scorecards={scorecards} businessName={business.name} size="sm" />
              )}
              <Button size="sm" onClick={() => navigate(`/business/${businessId}/scorecard`)}>
                <Plus className="mr-2 h-4 w-4" />
                New Scorecard
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <p className="text-muted-foreground">Loading scorecards...</p>
            )}

            {!isLoading && (!scorecards || scorecards.length === 0) && (
              <p className="text-muted-foreground">
                No scorecards yet. Create the first one!
              </p>
            )}

            {scorecardsWithTrend && scorecardsWithTrend.length > 0 && (
              <div className="space-y-3">
                {scorecardsWithTrend.map((scorecard) => (
                  <ScorecardHistoryItem
                    key={scorecard.id}
                    scorecard={scorecard}
                    trend={scorecard.trend}
                    onClick={() => navigate(`/business/${businessId}/view/${scorecard.id}`)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
