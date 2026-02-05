/**
 * City EBITDA Chart
 *
 * Grouped bar chart showing EBITDA target vs actual by month.
 * Includes EBITDA % as a line overlay.
 * Green/red colouring for above/below target.
 */

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { CityMonthlyAggregate } from '@/types/database.types'

interface CityEbitdaChartProps {
  data: CityMonthlyAggregate[]
  totals?: {
    ebitda_actual: number
    ebitda_target: number
    ebitdaPctActual: number
    ebitdaPctTarget: number
  } | null
}

// Format currency with K/M suffix
function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `£${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `£${(value / 1_000).toFixed(0)}K`
  }
  return `£${value.toFixed(0)}`
}

// Get month short name from YYYY-MM format
function getMonthName(month: string): string {
  const date = new Date(month + '-01')
  return date.toLocaleDateString('en-GB', { month: 'short' })
}

export function CityEbitdaChart({ data, totals }: CityEbitdaChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  // Transform data for chart
  const chartData = data.map((m) => ({
    month: getMonthName(m.month),
    fullMonth: m.month,
    target: m.total_ebitda_target || 0,
    actual: m.total_ebitda_actual || 0,
    ebitdaPctActual: m.ebitda_pct_actual || 0,
    ebitdaPctTarget: m.ebitda_pct_target || 0,
    isAboveTarget: (m.total_ebitda_actual || 0) >= (m.total_ebitda_target || 0),
  }))

  // Calculate max EBITDA % for secondary Y-axis domain
  const maxPct = Math.max(
    ...chartData.map((d) => Math.max(d.ebitdaPctActual, d.ebitdaPctTarget)),
    20 // Minimum 20% for better visualisation
  )

  return (
    <div className="space-y-4">
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 60, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={formatCompact}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, Math.ceil(maxPct / 5) * 5]}
              tick={{ fontSize: 12, fill: '#6b7280' }}
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
                const numValue = typeof value === 'number' ? value : 0
                if (name === 'ebitdaPctActual') {
                  return [`${numValue.toFixed(1)}%`, 'EBITDA % Actual']
                }
                if (name === 'ebitdaPctTarget') {
                  return [`${numValue.toFixed(1)}%`, 'EBITDA % Target']
                }
                const label = name === 'target' ? 'Target' : 'Actual'
                return [formatCompact(numValue), label]
              }}
              labelFormatter={(label) => <span className="font-medium">{String(label)}</span>}
            />

            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value) => {
                switch (value) {
                  case 'target': return 'EBITDA Target'
                  case 'actual': return 'EBITDA Actual'
                  case 'ebitdaPctActual': return 'EBITDA % Actual'
                  case 'ebitdaPctTarget': return 'EBITDA % Target'
                  default: return value
                }
              }}
            />

            {/* Target bars - dashed outline style */}
            <Bar
              yAxisId="left"
              dataKey="target"
              fill="#94a3b8"
              fillOpacity={0.3}
              stroke="#64748b"
              strokeWidth={2}
              strokeDasharray="4 2"
              radius={[4, 4, 0, 0]}
              barSize={30}
            />

            {/* Actual bars - solid fill with green/red */}
            <Bar
              yAxisId="left"
              dataKey="actual"
              radius={[4, 4, 0, 0]}
              barSize={30}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isAboveTarget ? '#22c55e' : '#ef4444'}
                  fillOpacity={0.9}
                />
              ))}
            </Bar>

            {/* EBITDA % Target line */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="ebitdaPctTarget"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={{ fill: '#94a3b8', r: 4 }}
            />

            {/* EBITDA % Actual line */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="ebitdaPctActual"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* YTD Summary */}
      {totals && (
        <div className="flex justify-center gap-8 pt-2 border-t">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">YTD EBITDA Target</p>
            <p className="text-lg font-semibold">{formatCompact(totals.ebitda_target)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">YTD EBITDA Actual</p>
            <p className={`text-lg font-semibold ${
              totals.ebitda_actual >= totals.ebitda_target ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCompact(totals.ebitda_actual)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">EBITDA % Target</p>
            <p className="text-lg font-semibold">{totals.ebitdaPctTarget.toFixed(1)}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">EBITDA % Actual</p>
            <p className={`text-lg font-semibold ${
              totals.ebitdaPctActual >= totals.ebitdaPctTarget ? 'text-green-600' : 'text-red-600'
            }`}>
              {totals.ebitdaPctActual.toFixed(1)}%
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
