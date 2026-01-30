import { useFormContext, Controller } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { PRODUCT_SCORES, PRODUCT_OPTIONS } from '@/lib/scoring'
import type { ScorecardData } from '@/schemas/scorecard'

/**
 * Product/Service Section Component (10 points max)
 *
 * Contains:
 * - Product/Service Strength: 4 options (10 points max)
 */
export function ProductSection() {
  const { watch, control } = useFormContext<ScorecardData>()

  // Watch selection for real-time calculation
  const productStrength = watch('productStrength')

  // Get score
  const score = PRODUCT_SCORES[productStrength || ''] ?? 0

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Product / Service</CardTitle>
          <div className="text-right">
            <span className="text-xl font-bold">{score}</span>
            <span className="text-muted-foreground"> / 10</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Label className="text-sm font-medium">Product / Service Strength</Label>

          <Controller
            name="productStrength"
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="space-y-2"
              >
                {PRODUCT_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={option.value} id={`productStrength-${option.value}`} />
                    <Label
                      htmlFor={`productStrength-${option.value}`}
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
