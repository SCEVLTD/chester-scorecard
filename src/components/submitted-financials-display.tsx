import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  scoreFinancialMetric,
  scoreOverheads,
  calculateFinancialSubtotal,
} from '@/lib/scoring'
import { submissionToVariances, formatVariance, formatCurrency } from '@/lib/variance-calculator'
import type { CompanySubmission } from '@/types/database.types'
import { FileCheck } from 'lucide-react'

interface SubmittedFinancialsDisplayProps {
  submission: CompanySubmission
}

interface MetricDisplayRowProps {
  label: string
  actual: number
  target: number
  variance: number
  score: number
  invertedLabel?: boolean
}

function MetricDisplayRow({
  label,
  actual,
  target,
  variance,
  score,
  invertedLabel = false,
}: MetricDisplayRowProps) {
  const varianceColor = variance >= 0
    ? (invertedLabel ? 'text-red-600' : 'text-green-600')
    : (invertedLabel ? 'text-green-600' : 'text-red-600')

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
 * Shows raw values, calculated variances, and scores
 */
export function SubmittedFinancialsDisplay({ submission }: SubmittedFinancialsDisplayProps) {
  const variances = submissionToVariances(submission)

  const scores = {
    revenue: scoreFinancialMetric(variances.revenueVariance),
    grossProfit: scoreFinancialMetric(variances.grossProfitVariance),
    overheads: scoreOverheads(variances.overheadsVariance),
    netProfit: scoreFinancialMetric(variances.netProfitVariance),
  }

  const subtotal = calculateFinancialSubtotal(
    variances.revenueVariance,
    variances.grossProfitVariance,
    variances.overheadsVariance,
    variances.netProfitVariance
  )

  return (
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
          <div className="text-right">
            <span className="text-xl font-bold">{subtotal}</span>
            <span className="text-muted-foreground"> / 40</span>
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

        <MetricDisplayRow
          label="Revenue"
          actual={submission.revenue_actual}
          target={submission.revenue_target}
          variance={variances.revenueVariance}
          score={scores.revenue}
        />
        <MetricDisplayRow
          label="Gross Profit"
          actual={submission.gross_profit_actual}
          target={submission.gross_profit_target}
          variance={variances.grossProfitVariance}
          score={scores.grossProfit}
        />
        <MetricDisplayRow
          label="Overheads"
          actual={submission.overheads_actual}
          target={submission.overheads_budget}
          variance={variances.overheadsVariance}
          score={scores.overheads}
          invertedLabel
        />
        <MetricDisplayRow
          label="Net Profit"
          actual={submission.net_profit_actual}
          target={submission.net_profit_target}
          variance={variances.netProfitVariance}
          score={scores.netProfit}
        />

        {/* Productivity info */}
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-12 gap-2 md:gap-4 items-center">
            <div className="col-span-6 md:col-span-3">
              <span className="text-sm font-medium">Productivity Data</span>
            </div>
            <div className="col-span-6 md:col-span-9 text-sm">
              <span className="text-slate-600">
                Wages: {formatCurrency(submission.total_wages)}
              </span>
              <span className="mx-2 text-slate-300">|</span>
              <span className="text-slate-600">
                Benchmark: {submission.productivity_benchmark.toFixed(2)}
              </span>
              <span className="mx-2 text-slate-300">|</span>
              <span className="text-slate-600">
                Actual: {(submission.gross_profit_actual / submission.total_wages).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
