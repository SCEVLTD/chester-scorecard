/**
 * Score Trend Chart (TRND-01)
 *
 * Displays total score over time as an area chart with RAG colour bands.
 * Y-axis fixed domain [0, 100] for consistent comparison across time periods.
 */

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ChartDataPoint } from '@/hooks/use-chart-data'

interface ScoreTrendChartProps {
  data: ChartDataPoint[]
  hideAxisValues?: boolean
}

// RAG thresholds
const RAG_GREEN = 70
const RAG_AMBER = 40

export function ScoreTrendChart({ data, hideAxisValues = false }: ScoreTrendChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-[350px] items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  // Get RAG colour for a score
  const getRagColor = (score: number) => {
    if (score >= RAG_GREEN) return '#22c55e'
    if (score >= RAG_AMBER) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          {/* RAG background bands */}
          <ReferenceArea y1={0} y2={RAG_AMBER} fill="#fef2f2" fillOpacity={0.5} />
          <ReferenceArea y1={RAG_AMBER} y2={RAG_GREEN} fill="#fffbeb" fillOpacity={0.5} />
          <ReferenceArea y1={RAG_GREEN} y2={100} fill="#f0fdf4" fillOpacity={0.5} />

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
            ticks={[0, 20, 40, 60, 80, 100]}
          />

          {/* RAG threshold lines */}
          <ReferenceLine
            y={RAG_GREEN}
            stroke="#22c55e"
            strokeDasharray="5 5"
            strokeWidth={1}
            label={{ value: 'Green', position: 'right', fill: '#22c55e', fontSize: 10 }}
          />
          <ReferenceLine
            y={RAG_AMBER}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            strokeWidth={1}
            label={{ value: 'Amber', position: 'right', fill: '#f59e0b', fontSize: 10 }}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(value) => {
              const numValue = typeof value === 'number' ? value : 0
              return [
                <span key="value" className="font-semibold" style={{ color: getRagColor(numValue) }}>
                  {numValue} / 100
                </span>,
                'Total Score',
              ]
            }}
            labelFormatter={(label) => <span className="font-medium">{String(label)}</span>}
          />

          {/* Area fill under line */}
          <Area
            type="monotone"
            dataKey="totalScore"
            fill="url(#scoreGradient)"
            stroke="none"
          />

          {/* Main trend line */}
          <Line
            type="monotone"
            dataKey="totalScore"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={(props) => {
              const { cx, cy, payload } = props
              const color = getRagColor(payload.totalScore)
              return (
                <circle
                  key={props.key}
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill={color}
                  stroke="white"
                  strokeWidth={2}
                />
              )
            }}
            activeDot={{ r: 8, fill: '#3b82f6', stroke: 'white', strokeWidth: 2 }}
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
