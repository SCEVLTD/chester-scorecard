/**
 * Score Trend Line Chart (TRND-01)
 *
 * Displays total score over time as a line chart.
 * Y-axis fixed domain [0, 100] for consistent comparison across time periods.
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { ChartDataPoint } from '@/hooks/use-chart-data'

const chartConfig = {
  totalScore: {
    label: 'Total Score',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig

interface ScoreTrendChartProps {
  data: ChartDataPoint[]
}

export function ScoreTrendChart({ data }: ScoreTrendChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <LineChart data={data} accessibilityLayer>
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
        />
        <ChartTooltip
          content={<ChartTooltipContent />}
        />
        <Line
          type="monotone"
          dataKey="totalScore"
          stroke="var(--color-totalScore)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-totalScore)' }}
        />
      </LineChart>
    </ChartContainer>
  )
}
