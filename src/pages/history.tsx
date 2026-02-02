import { useState } from 'react'
import { useParams, useLocation } from 'wouter'
import { ArrowLeft, Plus, Send, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useBusinesses } from '@/hooks/use-businesses'
import { useBusinessScorecards } from '@/hooks/use-scorecards'
import { calculateTrend } from '@/lib/scoring'
import { ScorecardHistoryItem } from '@/components/scorecard-history-item'
import { RequestDataModal } from '@/components/request-data-modal'
import { DataRequestList } from '@/components/data-request-list'
import { ExcelExportButton } from '@/components/excel-export-button'

/**
 * Business scorecard history page
 * Lists all scorecards for a business with trend indicators
 */
export function HistoryPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const [, navigate] = useLocation()
  const { data: businesses } = useBusinesses()
  const { data: scorecards, isLoading } = useBusinessScorecards(businessId!)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showRequests, setShowRequests] = useState(false)

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
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <img src="/velocity-logo.png" alt="Velocity" className="h-8" />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{business?.name || 'Loading...'}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/business/${businessId}/charts`)}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Charts
              </Button>
              {scorecards && scorecards.length > 0 && business && (
                <ExcelExportButton scorecards={scorecards} businessName={business.name} />
              )}
              <Button variant="outline" onClick={() => setShowRequestModal(true)}>
                <Send className="mr-2 h-4 w-4" />
                Request Data
              </Button>
              <Button onClick={() => navigate(`/business/${businessId}/scorecard`)}>
                <Plus className="mr-2 h-4 w-4" />
                New Scorecard
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Data Requests Section */}
            <div className="mb-6 border-b pb-4">
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => setShowRequests(!showRequests)}
              >
                <span className="text-sm font-medium text-slate-700">Company Data Requests</span>
                {showRequests ? (
                  <ChevronUp className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                )}
              </button>
              {showRequests && (
                <div className="mt-3">
                  <DataRequestList businessId={businessId!} />
                </div>
              )}
            </div>

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
                    onClick={() => navigate(`/business/${businessId}/scorecard/${scorecard.id}`)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {business && (
          <RequestDataModal
            businessId={businessId!}
            businessName={business.name}
            open={showRequestModal}
            onOpenChange={setShowRequestModal}
          />
        )}
      </div>
    </div>
  )
}
