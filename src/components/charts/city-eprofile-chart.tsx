/**
 * City E-Profile Chart
 *
 * Donut chart showing business distribution by E-Profile category.
 * Includes count labels and distinct colours for each category.
 */

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { EProfile } from '@/types/database.types'
import { E_PROFILE_LABELS } from '@/types/database.types'

interface EProfileData {
  e0_count: number
  e1_count: number
  e2_count: number
  e3_count: number
  e4_count: number
  e5_count: number
}

interface CityEprofileChartProps {
  data: EProfileData | null | undefined
}

// Distinct colours for each E-Profile category
const PROFILE_COLOURS: Record<EProfile, string> = {
  E0: '#94a3b8', // Slate - Entry
  E1: '#60a5fa', // Blue - Emerging
  E2: '#34d399', // Emerald - Expansion
  E3: '#fbbf24', // Amber - Elevation
  E4: '#f97316', // Orange - Established
  E5: '#a855f7', // Purple - Enterprise
}

export function CityEprofileChart({ data }: CityEprofileChartProps) {
  if (!data) {
    return (
      <div className="flex h-[350px] items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  // Transform data for chart
  const chartData = [
    { profile: 'E0' as EProfile, count: data.e0_count },
    { profile: 'E1' as EProfile, count: data.e1_count },
    { profile: 'E2' as EProfile, count: data.e2_count },
    { profile: 'E3' as EProfile, count: data.e3_count },
    { profile: 'E4' as EProfile, count: data.e4_count },
    { profile: 'E5' as EProfile, count: data.e5_count },
  ].filter((d) => d.count > 0) // Only show categories with businesses

  if (chartData.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center text-muted-foreground">
        No E-Profile data available
      </div>
    )
  }

  const total = chartData.reduce((sum, d) => sum + d.count, 0)

  // Custom label renderer for pie slices
  const renderCustomLabel = (props: {
    cx?: number
    cy?: number
    midAngle?: number
    innerRadius?: number
    outerRadius?: number
    value?: number
    index?: number
  }) => {
    const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, value = 0, index = 0 } = props
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    // Only show label if segment is large enough
    const percentage = (value / total) * 100
    if (percentage < 8) return null

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="font-semibold"
        style={{ fontSize: 14 }}
      >
        {chartData[index]?.profile}
      </text>
    )
  }

  return (
    <div className="h-[350px] w-full relative">
      {/* Center label - positioned to match Pie cx="50%" cy="45%" */}
      <div
        className="absolute left-1/2 pointer-events-none z-10 flex flex-col items-center"
        style={{ top: 'calc(45% - 20px)', transform: 'translateX(-50%)' }}
      >
        <span className="text-3xl font-bold text-slate-900">{total}</span>
        <span className="text-sm text-slate-500">Businesses</span>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
            dataKey="count"
            nameKey="profile"
            label={renderCustomLabel}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={PROFILE_COLOURS[entry.profile]}
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </Pie>

          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(value, name) => {
              const numValue = typeof value === 'number' ? value : 0
              const profile = String(name) as EProfile
              const percentage = ((numValue / total) * 100).toFixed(1)
              return [
                <span key="value" className="font-semibold">
                  {numValue} businesses ({percentage}%)
                </span>,
                `${profile}: ${E_PROFILE_LABELS[profile]}`,
              ]
            }}
          />

          <Legend
            layout="horizontal"
            align="center"
            verticalAlign="bottom"
            wrapperStyle={{ paddingTop: 8 }}
            formatter={(value: string) => {
              const profile = value as EProfile
              const item = chartData.find((d) => d.profile === profile)
              return (
                <span className="text-sm">
                  <span className="font-medium">{profile}</span>
                  <span className="text-muted-foreground ml-1">
                    ({item?.count || 0})
                  </span>
                </span>
              )
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
