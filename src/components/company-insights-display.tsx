import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Lightbulb, AlertTriangle, Target, Trophy } from 'lucide-react'
import type { CompanySubmission } from '@/types/database.types'

interface CompanyInsightsDisplayProps {
  submission: CompanySubmission
}

interface InsightItemProps {
  icon: React.ReactNode
  label: string
  content: string
}

function InsightItem({ icon, label, content }: InsightItemProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        {icon}
        {label}
      </div>
      <p className="text-sm text-slate-600 pl-6 whitespace-pre-wrap">{content}</p>
    </div>
  )
}

/**
 * Display company's qualitative insights submitted via the portal
 * Only shown when at least one qualitative field has content
 */
export function CompanyInsightsDisplay({ submission }: CompanyInsightsDisplayProps) {
  const hasInsights =
    submission.company_biggest_opportunity ||
    submission.company_biggest_risk ||
    submission.company_challenges ||
    submission.company_wins

  if (!hasInsights) {
    return null
  }

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Company Insights</CardTitle>
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Building2 className="h-3 w-3 mr-1" />
            From Company
          </Badge>
        </div>
        {submission.submitted_by_name && (
          <p className="text-xs text-slate-500">
            Provided by {submission.submitted_by_name}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {submission.company_biggest_opportunity && (
          <InsightItem
            icon={<Lightbulb className="h-4 w-4 text-amber-500" />}
            label="Biggest Opportunity"
            content={submission.company_biggest_opportunity}
          />
        )}

        {submission.company_biggest_risk && (
          <InsightItem
            icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
            label="Biggest Risk or Concern"
            content={submission.company_biggest_risk}
          />
        )}

        {submission.company_challenges && (
          <InsightItem
            icon={<Target className="h-4 w-4 text-orange-500" />}
            label="Current Challenges"
            content={submission.company_challenges}
          />
        )}

        {submission.company_wins && (
          <InsightItem
            icon={<Trophy className="h-4 w-4 text-green-500" />}
            label="Recent Wins"
            content={submission.company_wins}
          />
        )}
      </CardContent>
    </Card>
  )
}
