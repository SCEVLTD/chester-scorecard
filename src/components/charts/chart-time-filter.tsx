/**
 * Chart Time Filter (TRND-03)
 *
 * Button group for selecting time range for chart display.
 * Options: 3mo, 6mo, 12mo, All
 */

import { Button } from '@/components/ui/button'
import type { TimeRange } from '@/hooks/use-chart-filters'

const OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '3', label: '3mo' },
  { value: '6', label: '6mo' },
  { value: '12', label: '12mo' },
  { value: 'all', label: 'All' },
]

interface ChartTimeFilterProps {
  value: TimeRange
  onChange: (value: TimeRange) => void
}

export function ChartTimeFilter({ value, onChange }: ChartTimeFilterProps) {
  return (
    <div className="flex gap-1" role="group" aria-label="Time range filter">
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
