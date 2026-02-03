import { format } from 'date-fns'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AIAnalysisPanel } from '@/components/ai-analysis-panel'
import { PdfExportButton } from '@/components/pdf-export-button'
import { cn } from '@/lib/utils'
import type { Scorecard } from '@/types/database.types'

interface ConfirmationScreenProps {
  scorecard: Scorecard
  previousScorecard: Scorecard | null
  businessName: string
  onNewScorecard: () => void
  onBackToBusinesses: () => void
}

/**
 * RAG color mapping for badge backgrounds
 */
const ragColors: Record<string, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
}

/**
 * Leadership confidence display labels
 */
const confidenceLabels: Record<string, string> = {
  yes: 'Yes',
  maybe: 'Maybe',
  no: 'No',
}

/**
 * Confirmation Screen Component
 *
 * Displayed after successful scorecard submission.
 * Shows:
 * - Success header with green checkmark
 * - Final score with RAG badge
 * - Summary of all commentary fields
 * - Navigation buttons (new scorecard or back to list)
 */
export function ConfirmationScreen({
  scorecard,
  previousScorecard,
  businessName,
  onNewScorecard,
  onBackToBusinesses,
}: ConfirmationScreenProps) {
  // Format the month for display (e.g., "January 2026")
  const formattedMonth = format(new Date(scorecard.month + '-01'), 'MMMM yyyy')

  // Format submission timestamp
  const formattedDate = format(
    new Date(scorecard.created_at),
    'dd MMM yyyy, HH:mm'
  )

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Scorecard Submitted
        </h1>
        <p className="text-muted-foreground">
          {businessName} - {formattedMonth}
        </p>
      </div>

      {/* Score Summary Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Final Score</CardTitle>
            <Badge
              className={cn(
                'text-white',
                ragColors[scorecard.rag_status] || 'bg-gray-500'
              )}
            >
              {scorecard.rag_status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <span className="text-5xl font-bold">{scorecard.total_score}</span>
            <span className="text-2xl text-muted-foreground"> / 100</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Submitted by {scorecard.consultant_name} on {formattedDate}
          </p>
        </CardContent>
      </Card>

      {/* Commentary Summary Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Commentary Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Biggest Opportunity (next 90 days)
            </p>
            <p className="text-sm">{scorecard.biggest_opportunity}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Biggest Risk
            </p>
            <p className="text-sm">{scorecard.biggest_risk}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">
              What Management Is Avoiding
            </p>
            <p className="text-sm">{scorecard.management_avoiding}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Leadership Confidence
            </p>
            <p className="text-sm">
              {scorecard.leadership_confidence ? (confidenceLabels[scorecard.leadership_confidence] || scorecard.leadership_confidence) : 'Not specified'}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Consultant Gut Feel
            </p>
            <p className="text-sm">{scorecard.consultant_gut_feel}</p>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis */}
      <AIAnalysisPanel
        scorecard={scorecard}
        previousScorecard={previousScorecard}
        businessName={businessName}
      />

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        {/* PDF Export - primary action */}
        <PdfExportButton scorecard={scorecard} businessName={businessName} />

        {/* Navigation buttons */}
        <div className="flex flex-col md:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onNewScorecard}
            className="flex-1"
          >
            New Scorecard for {businessName}
          </Button>
          <Button onClick={onBackToBusinesses} className="flex-1">
            Back to Businesses
          </Button>
        </div>
      </div>
    </div>
  )
}
