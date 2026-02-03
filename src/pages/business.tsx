import { useState } from 'react'
import { useParams, useLocation } from 'wouter'
import { ArrowLeft, BarChart3, History, Plus } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useBusinesses } from '@/hooks/use-businesses'
import { useScorecard, useBusinessScorecards } from '@/hooks/use-scorecards'
import { BusinessScorecardView } from '@/components/business-scorecard-view'
import { AddActionModal } from '@/components/add-action-modal'
import { PendingActionsList } from '@/components/pending-actions-list'

/**
 * Business Scorecard Detail Page
 *
 * Read-only view of a specific scorecard with prominent score display,
 * AI analysis, and PDF export capabilities.
 *
 * Route: /business/:businessId/view/:scorecardId
 *
 * This is the primary view Chester admins use to review individual
 * business health. Score visibility and AI insights drive meeting discussions.
 */
export function BusinessPage() {
  const { businessId, scorecardId } = useParams<{ businessId: string; scorecardId: string }>()
  const [, navigate] = useLocation()
  const [actionModalOpen, setActionModalOpen] = useState(false)

  const { data: businesses } = useBusinesses()
  const { data: scorecard, isLoading: isLoadingScorecard } = useScorecard(scorecardId)
  const { data: scorecards } = useBusinessScorecards(businessId!)

  const business = businesses?.find(b => b.id === businessId)

  // Find previous scorecard (next in sorted list, which is previous month)
  const previousScorecard = scorecards
    ? (() => {
        const currentIndex = scorecards.findIndex(s => s.id === scorecardId)
        return currentIndex >= 0 && currentIndex < scorecards.length - 1
          ? scorecards[currentIndex + 1]
          : null
      })()
    : null

  if (isLoadingScorecard) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-muted-foreground">Loading scorecard...</p>
        </div>
      </div>
    )
  }

  if (!scorecard) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-muted-foreground">Scorecard not found.</p>
          <Button
            variant="ghost"
            onClick={() => navigate(`/business/${businessId}`)}
            className="mt-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to History
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header navigation */}
        <PageHeader
          backTo={`/business/${businessId}`}
          backText="Back to History"
          showTagline={false}
        />

        {/* Business name header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{business?.name || 'Loading...'}</h1>
                <p className="text-sm text-muted-foreground mt-1">Scorecard Review</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/business/${businessId}/charts`)}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Charts
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/business/${businessId}`)}
                >
                  <History className="mr-2 h-4 w-4" />
                  All History
                </Button>
                <Button onClick={() => setActionModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Action
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main scorecard view */}
        <BusinessScorecardView
          scorecard={scorecard}
          previousScorecard={previousScorecard}
          businessName={business?.name || 'Unknown Business'}
        />

        {/* Pending Actions */}
        <div className="mt-6">
          <PendingActionsList businessId={businessId!} />
        </div>

        {/* Add Action Modal */}
        <AddActionModal
          businessId={businessId!}
          businessName={business?.name || 'Unknown Business'}
          open={actionModalOpen}
          onOpenChange={setActionModalOpen}
        />
      </div>
    </div>
  )
}
