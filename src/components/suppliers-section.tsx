import { useFormContext, Controller } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { SUPPLIER_SCORES, SUPPLIER_OPTIONS } from '@/lib/scoring'
import type { ScorecardData } from '@/schemas/scorecard'

/**
 * Suppliers/Purchasing Section Component (5 points max)
 *
 * Contains:
 * - Supplier Strength: 4 options (5 points max)
 */
export function SuppliersSection() {
  const { watch, control } = useFormContext<ScorecardData>()

  // Watch selection for real-time calculation
  const supplierStrength = watch('supplierStrength')

  // Get score
  const score = SUPPLIER_SCORES[supplierStrength || ''] ?? 0

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Suppliers / Purchasing</CardTitle>
          <div className="text-right">
            <span className="text-xl font-bold">{score}</span>
            <span className="text-muted-foreground"> / 5</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Label className="text-sm font-medium">Supplier Strength</Label>

          <Controller
            name="supplierStrength"
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="space-y-2"
              >
                {SUPPLIER_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={option.value} id={`supplierStrength-${option.value}`} />
                    <Label
                      htmlFor={`supplierStrength-${option.value}`}
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
