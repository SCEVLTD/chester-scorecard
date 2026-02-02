import { useFormContext } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  scoreFinancialMetric,
  scoreOverheads,
  calculateFinancialSubtotal,
} from '@/lib/scoring'
import type { ScorecardData } from '@/schemas/scorecard'

interface MetricRowProps {
  label: string
  name: keyof ScorecardData
  score: number
  helpText?: string
}

/**
 * Internal component for rendering a single financial metric row
 * Layout: Label (5 cols) | Input with % suffix (4 cols) | Score display (3 cols)
 * Mobile: Stack label above input (12 cols, then 8|4 split)
 */
function MetricRow({ label, name, score, helpText }: MetricRowProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<ScorecardData>()

  const error = errors[name]

  return (
    <div className="grid grid-cols-12 gap-2 md:gap-4 items-start">
      {/* Label - full width on mobile, 5 cols on desktop */}
      <div className="col-span-12 md:col-span-5">
        <Label htmlFor={name} className="text-sm font-medium">
          {label}
        </Label>
        {helpText && (
          <p className="text-xs text-muted-foreground mt-0.5">{helpText}</p>
        )}
      </div>

      {/* Input with % suffix - 8 cols on mobile, 4 cols on desktop */}
      <div className="col-span-8 md:col-span-4">
        <div className="relative">
          <Input
            id={name}
            type="number"
            step="any"
            min="-100"
            max="100"
            placeholder="0"
            {...register(name, { valueAsNumber: true })}
            aria-invalid={!!error}
            className="pr-8"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            %
          </span>
        </div>
        {error && (
          <p className="text-xs text-red-500 mt-1">
            {error.message as string}
          </p>
        )}
      </div>

      {/* Score display - 4 cols on mobile, 3 cols on desktop */}
      <div className="col-span-4 md:col-span-3 flex items-center justify-end md:justify-center">
        <div className="text-right md:text-center">
          <span className="text-lg font-semibold">{score}</span>
          <span className="text-muted-foreground text-sm"> / 10</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Financial Performance section component
 *
 * Displays 4 financial metrics with real-time score calculation:
 * - Revenue vs Target
 * - Gross Profit vs Target
 * - Overheads vs Budget (inverted scoring)
 * - EBITDA vs Target
 *
 * Uses useFormContext to watch values and calculate scores on every change.
 * Maximum subtotal: 40 points (10 per metric)
 */
export function FinancialSection() {
  const { watch } = useFormContext<ScorecardData>()

  // Watch all four variance fields for real-time score updates
  const revenueVariance = watch('revenueVariance')
  const grossProfitVariance = watch('grossProfitVariance')
  const overheadsVariance = watch('overheadsVariance')
  const netProfitVariance = watch('netProfitVariance')

  // Calculate individual scores, handling undefined/NaN
  const scores = {
    revenue: scoreFinancialMetric(Number(revenueVariance) || 0),
    grossProfit: scoreFinancialMetric(Number(grossProfitVariance) || 0),
    overheads: scoreOverheads(Number(overheadsVariance) || 0),
    netProfit: scoreFinancialMetric(Number(netProfitVariance) || 0),
  }

  // Calculate subtotal
  const subtotal = calculateFinancialSubtotal(
    Number(revenueVariance) || 0,
    Number(grossProfitVariance) || 0,
    Number(overheadsVariance) || 0,
    Number(netProfitVariance) || 0
  )

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Financial Performance</CardTitle>
          <div className="text-right">
            <span className="text-xl font-bold">{subtotal}</span>
            <span className="text-muted-foreground"> / 40</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <MetricRow
          label="Revenue vs Target"
          name="revenueVariance"
          score={scores.revenue}
          helpText="Positive = above target"
        />
        <MetricRow
          label="Gross Profit vs Target"
          name="grossProfitVariance"
          score={scores.grossProfit}
          helpText="Positive = above target"
        />
        <MetricRow
          label="Overheads vs Budget"
          name="overheadsVariance"
          score={scores.overheads}
          helpText="Negative = under budget (good)"
        />
        <MetricRow
          label="EBITDA vs Target"
          name="netProfitVariance"
          score={scores.netProfit}
          helpText="Positive = above target"
        />
      </CardContent>
    </Card>
  )
}
