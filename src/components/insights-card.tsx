import {
  Lightbulb,
  AlertTriangle,
  HelpCircle,
  Trophy,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CompanySubmission } from '@/types/database.types'

interface InsightsCardProps {
  submission: CompanySubmission | null | undefined
}

interface InsightSectionProps {
  title: string
  icon: React.ReactNode
  content: string | null
}

/**
 * Individual insight section - always visible (not collapsible)
 */
function InsightSection({ title, icon, content }: InsightSectionProps) {
  // Don't render if no content
  if (!content || content.trim() === '') {
    return null
  }

  return (
    <div className="py-2 px-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="font-medium text-sm">{title}</span>
      </div>
      <div className="pl-6">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {content}
        </p>
      </div>
    </div>
  )
}

/**
 * InsightsCard Component
 *
 * Displays the four business insight questions from company submissions:
 * - Biggest Opportunity (next 90 days)
 * - Biggest Risk or Concern
 * - Current Challenges
 * - Recent Wins / Positive Developments
 *
 * All sections are always visible with icon indicators.
 * Gracefully handles empty/null values by not rendering those sections.
 */
export function InsightsCard({ submission }: InsightsCardProps) {
  // Don't render if no submission or all fields are empty
  if (!submission) {
    return null
  }

  const hasAnyInsights =
    submission.company_biggest_opportunity ||
    submission.company_biggest_risk ||
    submission.company_challenges ||
    submission.company_wins

  if (!hasAnyInsights) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Company Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <InsightSection
          title="Biggest Opportunity"
          icon={<Lightbulb className="h-4 w-4 text-amber-500" />}
          content={submission.company_biggest_opportunity}
        />
        <InsightSection
          title="Biggest Risk"
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          content={submission.company_biggest_risk}
        />
        <InsightSection
          title="Current Challenges"
          icon={<HelpCircle className="h-4 w-4 text-blue-500" />}
          content={submission.company_challenges}
        />
        <InsightSection
          title="Recent Wins"
          icon={<Trophy className="h-4 w-4 text-green-500" />}
          content={submission.company_wins}
        />
      </CardContent>
    </Card>
  )
}
