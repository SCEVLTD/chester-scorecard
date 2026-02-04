import { useFormContext, Controller } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { LEADERSHIP_SCORES, LEADERSHIP_OPTIONS } from '@/lib/scoring'
import type { ScorecardData } from '@/schemas/scorecard'

/**
 * People/HR Section Component (Simplified - 10 points max)
 *
 * Contains:
 * - Leadership: Radio selection with 4 options (10 points)
 *
 * Productivity removed from this version for simplicity.
 */
export function PeopleSection() {
  const { watch, control } = useFormContext<ScorecardData>()

  const leadership = watch('leadership')

  // Get leadership score
  const leadershipScore = LEADERSHIP_SCORES[leadership || ''] ?? 0

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">People / HR</CardTitle>
          <div className="text-right">
            <span className="text-xl font-bold">{leadershipScore}</span>
            <span className="text-muted-foreground"> / 10</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
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
