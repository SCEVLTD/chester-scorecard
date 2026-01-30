/**
 * Section Breakdown Bar Chart (TRND-02)
 *
 * Displays all 6 section scores as horizontal bars for a single month.
 * Uses percentage of max score for each section to enable meaningful comparison.
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { SECTION_CONFIG } from '@/lib/chart-utils'
import type { ChartDataPoint } from '@/hooks/use-chart-data'

const chartConfig = {
  percentage: {
    label: 'Score',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig

interface SectionBarData {
  section: string
  score: number
  maxScore: number
  percentage: number
  fill: string
}

interface SectionBreakdownChartProps {
  data: ChartDataPoint | null | undefined
}

export function SectionBreakdownChart({ data }: SectionBreakdownChartProps) {
  if (!data) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  // Transform section data to bar format with percentages
  const barData: SectionBarData[] = Object.entries(SECTION_CONFIG).map(
    ([key, config]) => {
      const score = data[key as keyof typeof SECTION_CONFIG]
      const maxScore = config.maxScore
      return {
        section: config.label,
        score,
        maxScore,
        percentage: Math.round((score / maxScore) * 100),
        fill: config.color,
      }
    }
  )

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <BarChart
        data={barData}
        layout="vertical"
        margin={{ left: 20 }}
        accessibilityLayer
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="section"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={80}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, _name, item) => {
                const payload = item.payload as unknown as SectionBarData | undefined
                if (!payload) return <span>{String(value)}%</span>
                return (
                  <span>
                    {payload.score}/{payload.maxScore} ({String(value)}%)
                  </span>
                )
              }}
            />
          }
        />
        <Bar dataKey="percentage" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
