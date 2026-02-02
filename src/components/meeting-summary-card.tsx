import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Trophy, AlertCircle, MessageSquare, Users } from 'lucide-react'
import type { MeetingSummary } from '@/schemas/meeting-summary'

interface MeetingSummaryCardProps {
  summary: MeetingSummary
}

/**
 * Meeting Summary Card Component
 *
 * Displays AI-generated meeting preparation summary with aggregated portfolio insights.
 * Shows wins, challenges, discussion points, and suggested group actions.
 */
export function MeetingSummaryCard({ summary }: MeetingSummaryCardProps) {
  const formattedDate = new Date(summary.generatedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <FileText className="h-5 w-5" />
          Meeting Prep Summary
          <span className="ml-auto text-sm font-normal text-muted-foreground">{formattedDate}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Health Summary */}
        <section>
          <h3 className="text-base font-semibold mb-2">Portfolio Health</h3>
          <p className="text-sm text-muted-foreground">{summary.healthSummary}</p>
        </section>

        {/* Aggregated Wins */}
        <section>
          <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-green-600" />
            Wins Across Portfolio
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {summary.aggregatedWins.map((win, i) => (
              <li key={i}>{win}</li>
            ))}
          </ul>
        </section>

        {/* Common Challenges */}
        <section>
          <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            Common Challenges
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {summary.commonChallenges.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>

        {/* Discussion Points */}
        <section>
          <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            Discussion Points
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            {summary.discussionPoints.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        </section>

        {/* Group Actions */}
        <section>
          <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-600" />
            Suggested Group Actions
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {summary.groupActions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </section>
      </CardContent>
    </Card>
  )
}
