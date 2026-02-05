import { useState } from 'react'
import {
  Lightbulb,
  AlertTriangle,
  HelpCircle,
  Trophy,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { CompanySubmission } from '@/types/database.types'

interface InsightsCardProps {
  submission: CompanySubmission | null | undefined
}

interface InsightSectionProps {
  title: string
  icon: React.ReactNode
  content: string | null
  defaultOpen?: boolean
}

/**
 * Individual insight section with collapsible content
 */
function InsightSection({ title, icon, content, defaultOpen = false }: InsightSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  // Don't render if no content
  if (!content || content.trim() === '') {
    return null
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-3 hover:bg-muted/50 rounded-md transition-colors">
        <span className="text-muted-foreground">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        {icon}
        <span className="font-medium text-sm flex-1 text-left">{title}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-9 pr-3 pb-3">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {content}
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
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
 * Each section is collapsible with an icon indicator.
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
          defaultOpen={true}
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
