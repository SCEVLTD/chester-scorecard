/**
 * Section Comparison Multi-Line Chart (TRND-04)
 *
 * Displays multiple section trends on the same chart for comparison.
 * Uses percentage of max score (0-100%) for meaningful cross-section comparison.
 * If no sections are specified, all 6 sections are shown.
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { SECTION_CONFIG } from '@/lib/chart-utils'
import type { ChartDataPoint } from '@/hooks/use-chart-data'

const SECTION_KEYS = Object.keys(SECTION_CONFIG) as Array<
  keyof typeof SECTION_CONFIG
>

// Build chart config from section config
const chartConfig = Object.fromEntries(
  SECTION_KEYS.map((key) => [
    key,
    {
      label: SECTION_CONFIG[key].label,
      color: SECTION_CONFIG[key].color,
    },
  ])
) satisfies ChartConfig

interface SectionComparisonChartProps {
  data: ChartDataPoint[]
  sections?: string[]
}

export function SectionComparisonChart({
  data,
  sections = [],
}: SectionComparisonChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  // Determine which sections to display
  const activeSections =
    sections.length > 0
      ? SECTION_KEYS.filter((key) => sections.includes(key))
      : SECTION_KEYS

  // Transform data to percentages for comparison
  const percentageData = data.map((point) => {
    const percentages: Record<string, number | string> = {
      month: point.month,
      monthRaw: point.monthRaw,
    }
    SECTION_KEYS.forEach((key) => {
      const score = point[key]
      const maxScore = SECTION_CONFIG[key].maxScore
      percentages[key] = Math.round((score / maxScore) * 100)
    })
    return percentages
  })

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <LineChart data={percentageData} accessibilityLayer>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => `${value}%`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => <span>{String(value)}%</span>}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {activeSections.map((key) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={`var(--color-${key})`}
            strokeWidth={2}
            dot={{ fill: `var(--color-${key})`, r: 3 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}
