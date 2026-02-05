/**
 * City Dashboard Page
 *
 * Displays aggregated Chester group financial performance.
 * Shows total revenue, EBITDA, and trends across all businesses.
 * Fully anonymised - no individual company data exposed.
 */

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TrendingUp, TrendingDown, Building2, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { FilterBar } from '@/components/filter-bar'
import {
  useCityMonthlyAggregate,
  useCityYtdAggregate,
  useYearOverYearComparison,
  useEProfileYearAggregate,
} from '@/hooks/use-city-aggregate'
import type { CityMonthlyAggregate, EProfile } from '@/types/database.types'

// Format currency for display
function formatCurrency(value: number | null | undefined, compact = false): string {
  if (value === null || value === undefined) return '-'
  const formatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: compact ? 2 : 0,
    maximumFractionDigits: compact ? 2 : 0,
    notation: compact ? 'compact' : 'standard',
  })
  return formatter.format(value)
}

// Format percentage for display
function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

// Month name helper
function getMonthName(month: string): string {
  const date = new Date(month + '-01')
  return date.toLocaleDateString('en-GB', { month: 'short' })
}

// Calculate YTD totals from monthly data
function calculateYtd(data: CityMonthlyAggregate[]) {
  return data.reduce(
    (acc, month) => ({
      revenue_actual: acc.revenue_actual + (month.total_revenue_actual || 0),
      revenue_target: acc.revenue_target + (month.total_revenue_target || 0),
      ebitda_actual: acc.ebitda_actual + (month.total_ebitda_actual || 0),
      ebitda_target: acc.ebitda_target + (month.total_ebitda_target || 0),
    }),
    { revenue_actual: 0, revenue_target: 0, ebitda_actual: 0, ebitda_target: 0 }
  )
}

interface KpiCardProps {
  title: string
  target: number
  actual: number
  variancePct: number | null
  isPercentage?: boolean
}

function KpiCard({ title, target, actual, variancePct, isPercentage = false }: KpiCardProps) {
  const isPositive = variancePct !== null && variancePct >= 0
  const formatValue = isPercentage
    ? (v: number) => `${v.toFixed(1)}%`
    : (v: number) => formatCurrency(v, true)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(actual)}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-muted-foreground">
            Target: {formatValue(target)}
          </span>
          {variancePct !== null && (
            <Badge variant={isPositive ? 'default' : 'destructive'} className="text-xs">
              {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {formatPercent(variancePct)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// All E-Profile categories
const ALL_PROFILES: EProfile[] = ['E0', 'E1', 'E2', 'E3', 'E4', 'E5']

export function CityDashboardPage() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedProfiles, setSelectedProfiles] = useState<Set<EProfile>>(new Set(ALL_PROFILES))

  const { data: monthlyData, isLoading: monthlyLoading } = useCityMonthlyAggregate(selectedYear)
  const { data: eprofileData } = useEProfileYearAggregate(selectedYear)
  const { data: ytdData } = useCityYtdAggregate()
  const { data: yoyData } = useYearOverYearComparison(selectedYear)

  // Toggle E-Profile selection
  const toggleProfile = (profile: EProfile) => {
    setSelectedProfiles((prev) => {
      const next = new Set(prev)
      if (next.has(profile)) {
        next.delete(profile)
      } else {
        next.add(profile)
      }
      return next
    })
  }

  // Filter and aggregate E-Profile data based on selection
  const filteredMonthlyData = useMemo(() => {
    if (!eprofileData || selectedProfiles.size === ALL_PROFILES.length) {
      // No filter or all selected - use the original city aggregate
      return monthlyData
    }

    // Group by month and sum selected profiles
    const monthMap = new Map<string, CityMonthlyAggregate>()

    eprofileData
      .filter((row) => selectedProfiles.has(row.e_profile as EProfile))
      .forEach((row) => {
        const existing = monthMap.get(row.month)
        if (existing) {
          monthMap.set(row.month, {
            ...existing,
            total_revenue_actual: (existing.total_revenue_actual || 0) + (row.total_revenue_actual || 0),
            total_revenue_target: (existing.total_revenue_target || 0) + (row.total_revenue_target || 0),
            total_ebitda_actual: (existing.total_ebitda_actual || 0) + (row.total_ebitda_actual || 0),
            total_ebitda_target: (existing.total_ebitda_target || 0) + (row.total_ebitda_target || 0),
            business_count: (existing.business_count || 0) + (row.business_count || 0),
          })
        } else {
          monthMap.set(row.month, {
            month: row.month,
            total_revenue_actual: row.total_revenue_actual || 0,
            total_revenue_target: row.total_revenue_target || 0,
            total_ebitda_actual: row.total_ebitda_actual || 0,
            total_ebitda_target: row.total_ebitda_target || 0,
            business_count: row.business_count || 0,
            businesses_with_ebitda: row.business_count || 0,
            revenue_variance_pct: null,
            ebitda_variance_pct: null,
            ebitda_pct_actual: null,
            ebitda_pct_target: null,
            e0_count: 0,
            e1_count: 0,
            e2_count: 0,
            e3_count: 0,
            e4_count: 0,
            e5_count: 0,
          })
        }
      })

    // Calculate percentages and sort
    const result = Array.from(monthMap.values())
      .map((m) => ({
        ...m,
        ebitda_pct_actual: m.total_revenue_actual && m.total_revenue_actual > 0
          ? (m.total_ebitda_actual || 0) / m.total_revenue_actual * 100
          : null,
        ebitda_pct_target: m.total_revenue_target && m.total_revenue_target > 0
          ? (m.total_ebitda_target || 0) / m.total_revenue_target * 100
          : null,
        revenue_variance_pct: m.total_revenue_target && m.total_revenue_target > 0
          ? ((m.total_revenue_actual || 0) - m.total_revenue_target) / m.total_revenue_target * 100
          : null,
        ebitda_variance_pct: m.total_ebitda_target && m.total_ebitda_target > 0
          ? ((m.total_ebitda_actual || 0) - m.total_ebitda_target) / m.total_ebitda_target * 100
          : null,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    return result
  }, [monthlyData, eprofileData, selectedProfiles])

  // Get available years from YTD data
  const availableYears = useMemo(() => {
    if (!ytdData) return [currentYear]
    return ytdData.map((y) => parseInt(y.year)).sort((a, b) => b - a)
  }, [ytdData, currentYear])

  // Calculate totals for display (using filtered data)
  const totals = useMemo(() => {
    if (!filteredMonthlyData || filteredMonthlyData.length === 0) return null
    const ytd = calculateYtd(filteredMonthlyData)
    const revenueVariance =
      ytd.revenue_target > 0
        ? ((ytd.revenue_actual - ytd.revenue_target) / ytd.revenue_target) * 100
        : null
    const ebitdaVariance =
      ytd.ebitda_target > 0
        ? ((ytd.ebitda_actual - ytd.ebitda_target) / ytd.ebitda_target) * 100
        : null
    const ebitdaPctActual = ytd.revenue_actual > 0 ? (ytd.ebitda_actual / ytd.revenue_actual) * 100 : 0
    const ebitdaPctTarget = ytd.revenue_target > 0 ? (ytd.ebitda_target / ytd.revenue_target) * 100 : 0

    return {
      ...ytd,
      revenueVariance,
      ebitdaVariance,
      ebitdaPctActual,
      ebitdaPctTarget,
      businessCount: filteredMonthlyData[0]?.business_count || 0,
    }
  }, [filteredMonthlyData])

  // Calculate YoY comparison
  const yoyComparison = useMemo(() => {
    if (!yoyData) return null
    const currentYtd = calculateYtd(yoyData.currentYear)
    const previousYtd = calculateYtd(yoyData.previousYear)

    if (previousYtd.revenue_actual === 0) return null

    const revenueChange =
      ((currentYtd.revenue_actual - previousYtd.revenue_actual) / previousYtd.revenue_actual) * 100

    return {
      currentRevenue: currentYtd.revenue_actual,
      previousRevenue: previousYtd.revenue_actual,
      changePercent: revenueChange,
    }
  }, [yoyData])

  if (monthlyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader backTo="/" />

      <h1 className="text-2xl font-bold text-center">Chester Group Results</h1>
      <p className="text-center text-muted-foreground mb-4">Aggregated performance across all businesses</p>

      {/* Unified Filter Bar - Year selector and E-Profile filter */}
      <FilterBar
        year={selectedYear}
        onYearChange={setSelectedYear}
        availableYears={availableYears}
        eProfileFilter={{
          selected: selectedProfiles,
          onToggle: toggleProfile,
        }}
      />

      {/* KPI Summary Cards */}
      {totals && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard
            title="YTD Revenue"
            target={totals.revenue_target}
            actual={totals.revenue_actual}
            variancePct={totals.revenueVariance}
          />
          <KpiCard
            title="YTD EBITDA"
            target={totals.ebitda_target}
            actual={totals.ebitda_actual}
            variancePct={totals.ebitdaVariance}
          />
          <KpiCard
            title="EBITDA %"
            target={totals.ebitdaPctTarget}
            actual={totals.ebitdaPctActual}
            variancePct={totals.ebitdaPctActual - totals.ebitdaPctTarget}
            isPercentage
          />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Businesses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {totals.businessCount}
              </div>
              {yoyComparison && (
                <div className="text-sm text-muted-foreground mt-1">
                  YoY Revenue:{' '}
                  <Badge
                    variant={yoyComparison.changePercent >= 0 ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {formatPercent(yoyComparison.changePercent)}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
          <CardDescription>
            Revenue and EBITDA performance by month for {selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background">Metric</TableHead>
                  {filteredMonthlyData?.map((m) => (
                    <TableHead key={m.month} className="text-right min-w-[80px]">
                      {getMonthName(m.month)}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-bold min-w-[100px]">YTD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Revenue Target */}
                <TableRow>
                  <TableCell className="sticky left-0 bg-background font-medium">
                    Sales Target
                  </TableCell>
                  {filteredMonthlyData?.map((m) => (
                    <TableCell key={m.month} className="text-right">
                      {formatCurrency(m.total_revenue_target, true)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold">
                    {totals && formatCurrency(totals.revenue_target, true)}
                  </TableCell>
                </TableRow>
                {/* Revenue Actual */}
                <TableRow>
                  <TableCell className="sticky left-0 bg-background font-medium">
                    Sales Actual
                  </TableCell>
                  {filteredMonthlyData?.map((m) => (
                    <TableCell key={m.month} className="text-right">
                      {formatCurrency(m.total_revenue_actual, true)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold">
                    {totals && formatCurrency(totals.revenue_actual, true)}
                  </TableCell>
                </TableRow>
                {/* EBITDA Target */}
                <TableRow>
                  <TableCell className="sticky left-0 bg-background font-medium">
                    EBITDA Target
                  </TableCell>
                  {filteredMonthlyData?.map((m) => (
                    <TableCell key={m.month} className="text-right">
                      {formatCurrency(m.total_ebitda_target, true)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold">
                    {totals && formatCurrency(totals.ebitda_target, true)}
                  </TableCell>
                </TableRow>
                {/* EBITDA Actual */}
                <TableRow>
                  <TableCell className="sticky left-0 bg-background font-medium">
                    EBITDA Actual
                  </TableCell>
                  {filteredMonthlyData?.map((m) => (
                    <TableCell key={m.month} className="text-right">
                      {formatCurrency(m.total_ebitda_actual, true)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold">
                    {totals && formatCurrency(totals.ebitda_actual, true)}
                  </TableCell>
                </TableRow>
                {/* EBITDA % Target */}
                <TableRow>
                  <TableCell className="sticky left-0 bg-background font-medium">
                    EBITDA % Target
                  </TableCell>
                  {filteredMonthlyData?.map((m) => (
                    <TableCell key={m.month} className="text-right">
                      {m.ebitda_pct_target?.toFixed(1)}%
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold">
                    {totals && `${totals.ebitdaPctTarget.toFixed(1)}%`}
                  </TableCell>
                </TableRow>
                {/* EBITDA % Actual */}
                <TableRow>
                  <TableCell className="sticky left-0 bg-background font-medium">
                    EBITDA % Actual
                  </TableCell>
                  {filteredMonthlyData?.map((m) => (
                    <TableCell
                      key={m.month}
                      className={`text-right ${
                        m.ebitda_pct_actual && m.ebitda_pct_target && m.ebitda_pct_actual >= m.ebitda_pct_target
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {m.ebitda_pct_actual?.toFixed(1)}%
                    </TableCell>
                  ))}
                  <TableCell
                    className={`text-right font-bold ${
                      totals && totals.ebitdaPctActual >= totals.ebitdaPctTarget
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {totals && `${totals.ebitdaPctActual.toFixed(1)}%`}
                  </TableCell>
                </TableRow>
                {/* Business Count */}
                <TableRow>
                  <TableCell className="sticky left-0 bg-background font-medium">
                    No. of Businesses
                  </TableCell>
                  {filteredMonthlyData?.map((m) => (
                    <TableCell key={m.month} className="text-right">
                      {m.business_count}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold">
                    {totals?.businessCount}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Year-over-Year Comparison */}
      {yoyComparison && yoyData && (
        <Card>
          <CardHeader>
            <CardTitle>Year-over-Year Comparison</CardTitle>
            <CardDescription>
              {selectedYear - 1} vs {selectedYear} revenue comparison
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background">Year</TableHead>
                    {yoyData.currentYear.map((m) => (
                      <TableHead key={m.month} className="text-right min-w-[80px]">
                        {getMonthName(m.month)}
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-bold min-w-[100px]">YTD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="sticky left-0 bg-background font-medium">
                      {selectedYear - 1}
                    </TableCell>
                    {yoyData.previousYear.map((m) => (
                      <TableCell key={m.month} className="text-right">
                        {formatCurrency(m.total_revenue_actual, true)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-bold">
                      {formatCurrency(yoyComparison.previousRevenue, true)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="sticky left-0 bg-background font-medium">
                      {selectedYear}
                    </TableCell>
                    {yoyData.currentYear.map((m) => (
                      <TableCell key={m.month} className="text-right">
                        {formatCurrency(m.total_revenue_actual, true)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-bold">
                      {formatCurrency(yoyComparison.currentRevenue, true)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="sticky left-0 bg-background font-medium">
                      % Change
                    </TableCell>
                    {yoyData.currentYear.map((m, i) => {
                      const prev = yoyData.previousYear[i]?.total_revenue_actual || 0
                      const curr = m.total_revenue_actual || 0
                      const change = prev > 0 ? ((curr - prev) / prev) * 100 : null
                      return (
                        <TableCell
                          key={m.month}
                          className={`text-right ${
                            change !== null && change >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {change !== null ? formatPercent(change) : '-'}
                        </TableCell>
                      )
                    })}
                    <TableCell
                      className={`text-right font-bold ${
                        yoyComparison.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatPercent(yoyComparison.changePercent)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* E-Profile Distribution Summary */}
      {monthlyData && monthlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>E-Profile Distribution</CardTitle>
            <CardDescription>Business count by E-Profile category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {[
                { profile: 'E0', label: 'Entry (<£0.5m)', count: monthlyData[0].e0_count },
                { profile: 'E1', label: 'Emerging', count: monthlyData[0].e1_count },
                { profile: 'E2', label: 'Expansion', count: monthlyData[0].e2_count },
                { profile: 'E3', label: 'Elevation', count: monthlyData[0].e3_count },
                { profile: 'E4', label: 'Established', count: monthlyData[0].e4_count },
                { profile: 'E5', label: 'Enterprise', count: monthlyData[0].e5_count },
              ].map(
                ({ profile, label, count }) =>
                  count > 0 && (
                    <Badge key={profile} variant="secondary" className="text-sm px-3 py-1">
                      {profile}: {count} ({label})
                    </Badge>
                  )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
