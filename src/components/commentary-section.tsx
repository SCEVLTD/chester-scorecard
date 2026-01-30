import { useFormContext, Controller } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { ScorecardData } from '@/schemas/scorecard'

/**
 * Leadership confidence options for consultant assessment
 * This is a qualitative input, not a scored metric
 */
const LEADERSHIP_CONFIDENCE_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no', label: 'No' },
] as const

/**
 * Commentary Section Component
 *
 * Contains all 5 mandatory commentary fields:
 * - Biggest Opportunity (next 90 days)
 * - Biggest Risk
 * - What Management Is Avoiding
 * - Leadership Confidence (Yes/Maybe/No radio)
 * - Consultant Gut Feel (plain English)
 *
 * All fields are required and validated via Zod schema.
 */
export function CommentarySection() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ScorecardData>()

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Consultant Commentary</CardTitle>
        <p className="text-sm text-muted-foreground">All fields are mandatory</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Biggest Opportunity */}
        <div className="space-y-2">
          <Label htmlFor="biggestOpportunity">
            Biggest Opportunity (next 90 days)
          </Label>
          <Textarea
            id="biggestOpportunity"
            {...register('biggestOpportunity')}
            placeholder="What is the single biggest opportunity for this business in the next 90 days?"
            className="min-h-[100px]"
            aria-invalid={!!errors.biggestOpportunity}
          />
          {errors.biggestOpportunity && (
            <p className="text-sm text-red-500">
              {errors.biggestOpportunity.message}
            </p>
          )}
        </div>

        {/* Biggest Risk */}
        <div className="space-y-2">
          <Label htmlFor="biggestRisk">Biggest Risk</Label>
          <Textarea
            id="biggestRisk"
            {...register('biggestRisk')}
            placeholder="What is the biggest risk facing this business right now?"
            className="min-h-[100px]"
            aria-invalid={!!errors.biggestRisk}
          />
          {errors.biggestRisk && (
            <p className="text-sm text-red-500">{errors.biggestRisk.message}</p>
          )}
        </div>

        {/* What Management Is Avoiding */}
        <div className="space-y-2">
          <Label htmlFor="managementAvoiding">What Management Is Avoiding</Label>
          <Textarea
            id="managementAvoiding"
            {...register('managementAvoiding')}
            placeholder="What conversation or decision is management avoiding?"
            className="min-h-[100px]"
            aria-invalid={!!errors.managementAvoiding}
          />
          {errors.managementAvoiding && (
            <p className="text-sm text-red-500">
              {errors.managementAvoiding.message}
            </p>
          )}
        </div>

        {/* Leadership Confidence */}
        <div className="space-y-3">
          <Label>Do you have confidence in the leadership team?</Label>
          <Controller
            name="leadershipConfidence"
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex gap-6"
              >
                {LEADERSHIP_CONFIDENCE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={option.value}
                      id={`confidence-${option.value}`}
                    />
                    <Label
                      htmlFor={`confidence-${option.value}`}
                      className="cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
          {errors.leadershipConfidence && (
            <p className="text-sm text-red-500">
              {errors.leadershipConfidence.message}
            </p>
          )}
        </div>

        {/* Consultant Gut Feel */}
        <div className="space-y-2">
          <Label htmlFor="consultantGutFeel">
            Consultant Gut Feel (plain English)
          </Label>
          <Textarea
            id="consultantGutFeel"
            {...register('consultantGutFeel')}
            placeholder="In plain English, what's your overall gut feeling about this business?"
            className="min-h-[120px]"
            aria-invalid={!!errors.consultantGutFeel}
          />
          {errors.consultantGutFeel && (
            <p className="text-sm text-red-500">
              {errors.consultantGutFeel.message}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
