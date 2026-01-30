import { useFormContext, Controller } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  calculateProductivityVariance,
  scoreProductivity,
  LEADERSHIP_SCORES,
  LEADERSHIP_OPTIONS,
} from '@/lib/scoring'
import type { ScorecardData } from '@/schemas/scorecard'

/**
 * People/HR Section Component (20 points max)
 *
 * Contains:
 * - Productivity: Benchmark and Actual GP/Wages ratios (10 points)
 * - Leadership: Radio selection with 4 options (10 points)
 *
 * Uses +/-15%, +/-5% thresholds for productivity scoring.
 */
export function PeopleSection() {
  const { watch, register, control, formState: { errors } } = useFormContext<ScorecardData>()

  // Watch productivity fields for real-time calculation
  const productivityBenchmark = watch('productivityBenchmark')
  const productivityActual = watch('productivityActual')
  const leadership = watch('leadership')

  // Calculate productivity score
  const variance = calculateProductivityVariance(
    Number(productivityBenchmark) || 0,
    Number(productivityActual) || 0
  )
  const productivityScore = scoreProductivity(variance)

  // Get leadership score
  const leadershipScore = LEADERSHIP_SCORES[leadership || ''] ?? 0

  // Calculate subtotal
  const subtotal = productivityScore + leadershipScore

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">People / HR</CardTitle>
          <div className="text-right">
            <span className="text-xl font-bold">{subtotal}</span>
            <span className="text-muted-foreground"> / 20</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Productivity Inputs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Productivity (GP / Wages)</Label>
            <div className="text-right">
              <span className="text-lg font-semibold">{productivityScore}</span>
              <span className="text-muted-foreground text-sm"> / 10</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="productivityBenchmark" className="text-xs text-muted-foreground">
                Benchmark Ratio
              </Label>
              <Input
                id="productivityBenchmark"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 2.0"
                {...register('productivityBenchmark', { valueAsNumber: true })}
                aria-invalid={!!errors.productivityBenchmark}
              />
              {errors.productivityBenchmark && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.productivityBenchmark.message as string}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="productivityActual" className="text-xs text-muted-foreground">
                Actual Ratio
              </Label>
              <Input
                id="productivityActual"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 2.3"
                {...register('productivityActual', { valueAsNumber: true })}
                aria-invalid={!!errors.productivityActual}
              />
              {errors.productivityActual && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.productivityActual.message as string}
                </p>
              )}
            </div>
          </div>

          {/* Show calculated variance when both values are present */}
          {Number(productivityBenchmark) > 0 && Number(productivityActual) > 0 && (
            <p className="text-xs text-muted-foreground">
              Variance: {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
            </p>
          )}
        </div>

        {/* Leadership Radio Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Leadership / Alignment Index</Label>
            <div className="text-right">
              <span className="text-lg font-semibold">{leadershipScore}</span>
              <span className="text-muted-foreground text-sm"> / 10</span>
            </div>
          </div>

          <Controller
            name="leadership"
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="space-y-2"
              >
                {LEADERSHIP_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={option.value} id={`leadership-${option.value}`} />
                    <Label
                      htmlFor={`leadership-${option.value}`}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      {option.label}
                    </Label>
                    <span className="text-muted-foreground text-sm">{option.points} pts</span>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}
