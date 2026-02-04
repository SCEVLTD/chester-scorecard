import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { scoreFinancialMetric } from '@/lib/scoring'
import { formatVariance, formatCurrency } from '@/lib/variance-calculator'
import type { CompanySubmission } from '@/types/database.types'
import { FileCheck, Pencil, Phone, ShoppingCart } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

interface SubmittedFinancialsDisplayProps {
  submission: CompanySubmission
  onEdit?: () => void
}

interface MetricDisplayRowProps {
  label: string
  actual: number
  target: number
  variance: number
  score: number
}

function MetricDisplayRow({
  label,
  actual,
  target,
  variance,
  score,
}: MetricDisplayRowProps) {
  const varianceColor = variance >= 0 ? 'text-green-600' : 'text-red-600'

  return (
    <div className="grid grid-cols-12 gap-2 md:gap-4 items-center py-2 border-b border-slate-100 last:border-0">
      {/* Label */}
      <div className="col-span-12 md:col-span-3">
        <span className="text-sm font-medium">{label}</span>
      </div>

      {/* Actual vs Target */}
      <div className="col-span-6 md:col-span-4">
        <div className="text-sm">
          <span className="font-medium">{formatCurrency(actual)}</span>
          <span className="text-slate-400 mx-1">vs</span>
          <span className="text-slate-600">{formatCurrency(target)}</span>
        </div>
      </div>

      {/* Variance */}
      <div className="col-span-3 md:col-span-2">
        <span className={`text-sm font-medium ${varianceColor}`}>
          {formatVariance(variance)}
        </span>
      </div>

      {/* Score */}
      <div className="col-span-3 md:col-span-3 text-right">
        <span className="text-lg font-semibold">{score}</span>
        <span className="text-slate-400 text-sm"> / 10</span>
      </div>
    </div>
  )
}

/**
 * Read-only display of submitted financial data from company portal
 * Shows Revenue + EBITDA only (simplified version)
 */
export function SubmittedFinancialsDisplay({ submission, onEdit }: SubmittedFinancialsDisplayProps) {
  const { userRole } = useAuth()

  // Consultants should not see raw financial figures (AUTH-08)
  if (userRole === 'consultant') {
    return null
  }

  // Calculate variances for Revenue and EBITDA only
  const revenueVariance = submission.revenue_target && submission.revenue_target !== 0
    ? ((submission.revenue_actual ?? 0) - submission.revenue_target) / submission.revenue_target * 100
    : null

  const ebitdaVariance = submission.net_profit_target && submission.net_profit_target !== 0
    ? ((submission.net_profit_actual ?? 0) - submission.net_profit_target) / submission.net_profit_target * 100
    : null

  // Calculate scores (20 points max for simplified version)
  const revenueScore = revenueVariance != null ? scoreFinancialMetric(revenueVariance) : 0
  const ebitdaScore = ebitdaVariance != null ? scoreFinancialMetric(ebitdaVariance) : 0
  const totalScore = revenueScore + ebitdaScore
  const maxScore = (revenueVariance != null ? 10 : 0) + (ebitdaVariance != null ? 10 : 0)

  return (
    <div className="space-y-4">
      {/* Financial Performance Card */}
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Financial Performance</CardTitle>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                <FileCheck className="h-3 w-3 mr-1" />
                Company Submitted
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xl font-bold">{totalScore}</span>
                <span className="text-muted-foreground"> / {maxScore}</span>
              </div>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </div>
          {submission.submitted_by_name && (
            <p className="text-xs text-slate-500 mt-1">
              Submitted by {submission.submitted_by_name}
              {submission.submitted_by_email && ` (${submission.submitted_by_email})`}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="grid grid-cols-12 gap-2 md:gap-4 text-xs text-slate-500 pb-2 border-b">
            <div className="col-span-12 md:col-span-3">Metric</div>
            <div className="col-span-6 md:col-span-4">Actual vs Target</div>
            <div className="col-span-3 md:col-span-2">Variance</div>
            <div className="col-span-3 md:col-span-3 text-right">Score</div>
          </div>

          {revenueVariance != null && (
            <MetricDisplayRow
              label="Revenue"
              actual={submission.revenue_actual ?? 0}
              target={submission.revenue_target ?? 0}
              variance={revenueVariance}
              score={revenueScore}
            />
          )}
          {ebitdaVariance != null && (
            <MetricDisplayRow
              label="EBITDA"
              actual={submission.net_profit_actual ?? 0}
              target={submission.net_profit_target ?? 0}
              variance={ebitdaVariance}
              score={ebitdaScore}
            />
          )}
        </CardContent>
      </Card>

      {/* Lead KPIs Card - only show if there's data */}
      {(submission.outbound_calls != null || submission.first_orders != null) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Lead KPIs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {submission.outbound_calls != null && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Phone className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Outbound Calls</p>
                    <p className="text-xl font-semibold">{submission.outbound_calls}</p>
                  </div>
                </div>
              )}
              {submission.first_orders != null && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="p-2 bg-green-100 rounded-full">
                    <ShoppingCart className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">First Orders</p>
                    <p className="text-xl font-semibold">{submission.first_orders}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
