import { useFormContext, Controller } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { SALES_SCORES, SALES_OPTIONS } from '@/lib/scoring'
import type { ScorecardData } from '@/schemas/scorecard'

/**
 * Sales Execution Section Component (10 points max)
 *
 * Contains:
 * - Sales Execution: 4 options (10 points max)
 */
export function SalesSection() {
  const { watch, control } = useFormContext<ScorecardData>()

  // Watch selection for real-time calculation
  const salesExecution = watch('salesExecution')

  // Get score
  const score = SALES_SCORES[salesExecution || ''] ?? 0

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Sales</CardTitle>
          <div className="text-right">
            <span className="text-xl font-bold">{score}</span>
            <span className="text-muted-foreground"> / 10</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Label className="text-sm font-medium">Sales Execution</Label>

          <Controller
            name="salesExecution"
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="space-y-2"
              >
                {SALES_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={option.value} id={`salesExecution-${option.value}`} />
                    <Label
                      htmlFor={`salesExecution-${option.value}`}
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
