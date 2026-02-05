/**
 * Section Comparison Chart (TRND-04)
 *
 * Displays multiple section trends as stacked areas or multi-line chart.
 * Uses percentage of max score (0-100%) for meaningful cross-section comparison.
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { SECTION_CONFIG } from '@/lib/chart-utils'
import type { ChartDataPoint } from '@/hooks/use-chart-data'

const SECTION_KEYS = Object.keys(SECTION_CONFIG) as Array<
  keyof typeof SECTION_CONFIG
>

// Colours for each section
const SECTION_COLORS: Record<string, string> = {
  financialTotal: '#3b82f6',     // Blue
  peopleTotal: '#22c55e',        // Green
  strategicTotal: '#f59e0b',     // Amber
  revenueScore: '#8b5cf6',       // Purple
  gpScore: '#06b6d4',            // Cyan
  netProfitScore: '#ec4899',     // Pink
}

interface SectionComparisonChartProps {
  data: ChartDataPoint[]
  sections?: string[]
  hideAxisValues?: boolean
}

export function SectionComparisonChart({
  data,
  sections = [],
  hideAxisValues = false,
}: SectionComparisonChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
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
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={percentageData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <defs>
            {activeSections.map((key) => (
              <linearGradient key={`gradient-${key}`} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={SECTION_COLORS[key] || SECTION_CONFIG[key].color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={SECTION_COLORS[key] || SECTION_CONFIG[key].color} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            domain={[0, 100]}
            tick={hideAxisValues ? false : { fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => `${value}%`}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(value, name) => {
              const sectionKey = String(name) as keyof typeof SECTION_CONFIG
              const config = SECTION_CONFIG[sectionKey]
              return [
                <span key="value" className="font-semibold">
                  {value}%
                </span>,
                config?.label || String(name),
              ]
            }}
            labelFormatter={(label) => <span className="font-medium">{String(label)}</span>}
          />

          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => {
              const config = SECTION_CONFIG[value as keyof typeof SECTION_CONFIG]
              return <span className="text-sm">{config?.label || value}</span>
            }}
          />

          {activeSections.map((key) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              name={key}
              stroke={SECTION_COLORS[key] || SECTION_CONFIG[key].color}
              strokeWidth={2}
              fill={`url(#gradient-${key})`}
              fillOpacity={1}
              dot={{
                fill: SECTION_COLORS[key] || SECTION_CONFIG[key].color,
                stroke: 'white',
                strokeWidth: 2,
                r: 4,
              }}
              activeDot={{
                fill: SECTION_COLORS[key] || SECTION_CONFIG[key].color,
                stroke: 'white',
                strokeWidth: 2,
                r: 6,
              }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
