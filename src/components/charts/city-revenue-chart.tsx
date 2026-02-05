/**
 * City Revenue Chart
 *
 * Grouped bar chart showing revenue target vs actual by month.
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

interface CityRevenueChartProps {
  data: CityMonthlyAggregate[]
  totals?: {
    revenue_actual: number
    revenue_target: number
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

export function CityRevenueChart({ data, totals }: CityRevenueChartProps) {
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
    target: m.total_revenue_target || 0,
    actual: m.total_revenue_actual || 0,
    variance: (m.total_revenue_actual || 0) - (m.total_revenue_target || 0),
    variancePct: m.revenue_variance_pct,
    isAboveTarget: (m.total_revenue_actual || 0) >= (m.total_revenue_target || 0),
  }))

  return (
    <div className="space-y-4">
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={formatCompact}
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
                const label = name === 'target' ? 'Target' : 'Actual'
                return [formatCompact(numValue), label]
              }}
              labelFormatter={(label) => <span className="font-medium">{String(label)}</span>}
            />

            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value) => (value === 'target' ? 'Target' : 'Actual')}
            />

            {/* Target bars - dashed outline style effect via opacity */}
            <Bar
              dataKey="target"
              fill="#94a3b8"
              fillOpacity={0.3}
              stroke="#64748b"
              strokeWidth={2}
              strokeDasharray="4 2"
              radius={[4, 4, 0, 0]}
              barSize={30}
            />

            {/* Actual bars - solid fill with green/red based on performance */}
            <Bar
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

            {/* Target line overlay for clearer comparison */}
            <Line
              type="monotone"
              dataKey="target"
              stroke="#475569"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* YTD Summary */}
      {totals && (
        <div className="flex justify-center gap-8 pt-2 border-t">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">YTD Target</p>
            <p className="text-lg font-semibold">{formatCompact(totals.revenue_target)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">YTD Actual</p>
            <p className={`text-lg font-semibold ${
              totals.revenue_actual >= totals.revenue_target ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCompact(totals.revenue_actual)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Variance</p>
            <p className={`text-lg font-semibold ${
              totals.revenue_actual >= totals.revenue_target ? 'text-green-600' : 'text-red-600'
            }`}>
              {totals.revenue_target > 0
                ? `${((totals.revenue_actual - totals.revenue_target) / totals.revenue_target * 100).toFixed(1)}%`
                : '-'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
