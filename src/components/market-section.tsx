import { useFormContext, Controller } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  MARKET_DEMAND_SCORES,
  MARKET_DEMAND_OPTIONS,
  MARKETING_SCORES,
  MARKETING_OPTIONS,
} from '@/lib/scoring'
import type { ScorecardData } from '@/schemas/scorecard'

/**
 * Market & Demand Section Component (15 points max)
 *
 * Contains:
 * - Market Demand Index: 4 options (7.5 points max)
 * - Marketing Effectiveness Index: 4 options (7.5 points max)
 */
export function MarketSection() {
  const { watch, control } = useFormContext<ScorecardData>()

  // Watch selections for real-time calculation
  const marketDemand = watch('marketDemand')
  const marketing = watch('marketing')

  // Get scores
  const demandScore = MARKET_DEMAND_SCORES[marketDemand || ''] ?? 0
  const marketingScore = MARKETING_SCORES[marketing || ''] ?? 0

  // Calculate subtotal
  const subtotal = demandScore + marketingScore

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Market & Demand</CardTitle>
          <div className="text-right">
            <span className="text-xl font-bold">{subtotal}</span>
            <span className="text-muted-foreground"> / 15</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Market Demand Index */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Market Demand Index</Label>
            <div className="text-right">
              <span className="text-lg font-semibold">{demandScore}</span>
              <span className="text-muted-foreground text-sm"> / 7.5</span>
            </div>
          </div>

          <Controller
            name="marketDemand"
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="space-y-2"
              >
                {MARKET_DEMAND_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={option.value} id={`marketDemand-${option.value}`} />
                    <Label
                      htmlFor={`marketDemand-${option.value}`}
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

        {/* Marketing Effectiveness Index */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Marketing Effectiveness Index</Label>
            <div className="text-right">
              <span className="text-lg font-semibold">{marketingScore}</span>
              <span className="text-muted-foreground text-sm"> / 7.5</span>
            </div>
          </div>

          <Controller
            name="marketing"
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="space-y-2"
              >
                {MARKETING_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={option.value} id={`marketing-${option.value}`} />
                    <Label
                      htmlFor={`marketing-${option.value}`}
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
