/**
 * Section Breakdown Bar Chart (TRND-02)
 *
 * Displays all section scores as horizontal bars for a single month.
 * Uses percentage of max score with actual/max values shown.
 * Colour-coded by performance (green/amber/red).
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import { SECTION_CONFIG } from '@/lib/chart-utils'
import type { ChartDataPoint } from '@/hooks/use-chart-data'

interface SectionBarData {
  section: string
  sectionKey: string
  score: number
  maxScore: number
  percentage: number
}

interface SectionBreakdownChartProps {
  data: ChartDataPoint | null | undefined
}

// Get colour based on percentage performance
function getPerformanceColor(percentage: number): string {
  if (percentage >= 70) return '#22c55e' // Green
  if (percentage >= 50) return '#f59e0b' // Amber
  return '#ef4444' // Red
}

export function SectionBreakdownChart({ data }: SectionBreakdownChartProps) {
  if (!data) {
    return (
      <div className="flex h-[350px] items-center justify-center text-muted-foreground">
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
        sectionKey: key,
        score,
        maxScore,
        percentage: Math.round((score / maxScore) * 100),
      }
    }
  )

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={barData}
          layout="vertical"
          margin={{ top: 20, right: 80, left: 20, bottom: 5 }}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis
            type="category"
            dataKey="section"
            tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            width={100}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(value, _name, props) => {
              const payload = props.payload as SectionBarData | undefined
              if (!payload) return [String(value), '']
              return [
                <span key="value" className="font-semibold">
                  {payload.score} / {payload.maxScore} ({value}%)
                </span>,
                payload.section,
              ]
            }}
            labelFormatter={() => null}
          />

          <Bar
            dataKey="percentage"
            radius={[0, 6, 6, 0]}
            barSize={28}
          >
            {barData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getPerformanceColor(entry.percentage)} />
            ))}
            <LabelList
              dataKey="percentage"
              position="right"
              formatter={(value) => `${value}%`}
              style={{ fill: '#374151', fontWeight: 600, fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
