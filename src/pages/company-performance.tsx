/**
 * Company Performance Page
 *
 * Displays historical revenue and EBITDA performance for a single company.
 * Shows charts comparing actuals vs targets over time.
 * RLS ensures companies can only see their own data.
 */

import { useState, useMemo } from 'react'
import { useParams } from 'wouter'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TrendingUp, TrendingDown, Loader2, Calendar } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useCompanyPerformance, useCompanyYtdSummary } from '@/hooks/use-company-performance'
import { useBusinesses } from '@/hooks/use-businesses'
import { E_PROFILE_LABELS, type EProfile } from '@/types/database.types'

// Format currency for display
function formatCurrency(value: number | null | undefined, compact = false): string {
  if (value === null || value === undefined) return '-'
  const formatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
  return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

type TimeRange = '6m' | '12m' | '24m' | 'all'

export function CompanyPerformancePage() {
  const params = useParams<{ businessId: string }>()
  const businessId = params.businessId
  const currentYear = new Date().getFullYear()
  const [timeRange, setTimeRange] = useState<TimeRange>('12m')

  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    const now = new Date()
    let fromDate: Date
    switch (timeRange) {
      case '6m':
        fromDate = new Date(now.getFullYear(), now.getMonth() - 6, 1)
        break
      case '12m':
        fromDate = new Date(now.getFullYear(), now.getMonth() - 12, 1)
        break
      case '24m':
        fromDate = new Date(now.getFullYear(), now.getMonth() - 24, 1)
        break
      default:
        return undefined
    }
    const fromMonth = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}`
    return { fromMonth }
  }, [timeRange])

  const { data: performanceData, isLoading } = useCompanyPerformance(businessId, dateRange)
  const { data: ytdSummary } = useCompanyYtdSummary(businessId, currentYear)
  const { data: businesses } = useBusinesses()

  // Get business info
  const business = useMemo(() => {
    if (!businesses || !businessId) return null
    return businesses.find((b) => b.id === businessId)
  }, [businesses, businessId])

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!performanceData) return []
    return performanceData.map((d) => ({
      month: getMonthName(d.month),
      fullMonth: d.month,
      revenueActual: d.revenue_actual || 0,
      revenueTarget: d.revenue_target || 0,
      ebitdaActual: d.ebitda_actual || 0,
      ebitdaTarget: d.ebitda_target || 0,
    }))
  }, [performanceData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const businessName = performanceData?.[0]?.business_name || business?.name || 'Company'
  const eProfile = (performanceData?.[0]?.e_profile || business?.e_profile) as EProfile | null

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        backTo={`/business/${businessId}`}
        actions={
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <TabsList>
              <TabsTrigger value="6m">6M</TabsTrigger>
              <TabsTrigger value="12m">12M</TabsTrigger>
              <TabsTrigger value="24m">24M</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <h1 className="text-2xl font-bold text-center">{businessName} - Performance</h1>
      <p className="text-center text-muted-foreground mb-4">
        {eProfile ? E_PROFILE_LABELS[eProfile] : 'Historical revenue and EBITDA performance'}
      </p>

      {/* YTD Summary Cards */}
      {ytdSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {currentYear} YTD Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-bold">
                    {formatCurrency(ytdSummary.revenue_actual)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    of {formatCurrency(ytdSummary.revenue_target)}
                  </span>
                </div>
                <Progress
                  value={
                    ytdSummary.revenue_target > 0
                      ? Math.min((ytdSummary.revenue_actual / ytdSummary.revenue_target) * 100, 100)
                      : 0
                  }
                  className="h-2"
                />
                {ytdSummary.revenue_variance_pct !== null && (
                  <Badge
                    variant={ytdSummary.revenue_variance_pct >= 0 ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {ytdSummary.revenue_variance_pct >= 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {formatPercent(ytdSummary.revenue_variance_pct)} vs target
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {currentYear} YTD EBITDA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-bold">
                    {formatCurrency(ytdSummary.ebitda_actual)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    of {formatCurrency(ytdSummary.ebitda_target)}
                  </span>
                </div>
                <Progress
                  value={
                    ytdSummary.ebitda_target > 0
                      ? Math.min((ytdSummary.ebitda_actual / ytdSummary.ebitda_target) * 100, 100)
                      : 0
                  }
                  className="h-2"
                />
                <div className="flex items-center gap-2">
                  {ytdSummary.ebitda_variance_pct !== null && (
                    <Badge
                      variant={ytdSummary.ebitda_variance_pct >= 0 ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {ytdSummary.ebitda_variance_pct >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {formatPercent(ytdSummary.ebitda_variance_pct)} vs target
                    </Badge>
                  )}
                  {ytdSummary.ebitda_pct !== null && (
                    <Badge variant="secondary" className="text-xs">
                      {ytdSummary.ebitda_pct.toFixed(1)}% margin
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue: Target vs Actual</CardTitle>
          <CardDescription>Monthly revenue performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value, true)}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenueTarget"
                  name="Target"
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="revenueActual"
                  name="Actual"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* EBITDA Chart */}
      <Card>
        <CardHeader>
          <CardTitle>EBITDA: Target vs Actual</CardTitle>
          <CardDescription>Monthly EBITDA performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value, true)}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="ebitdaTarget"
                  name="Target"
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="ebitdaActual"
                  name="Actual"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Detail</CardTitle>
          <CardDescription>Detailed breakdown of monthly performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Rev Target</TableHead>
                  <TableHead className="text-right">Rev Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">EBITDA Target</TableHead>
                  <TableHead className="text-right">EBITDA Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceData?.map((row) => {
                  const revVariance =
                    row.revenue_target && row.revenue_target > 0
                      ? ((row.revenue_actual || 0) - row.revenue_target) / row.revenue_target * 100
                      : null
                  const ebitdaVariance =
                    row.ebitda_target && row.ebitda_target > 0
                      ? ((row.ebitda_actual || 0) - row.ebitda_target) / row.ebitda_target * 100
                      : null
                  return (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {getMonthName(row.month)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.revenue_target)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.revenue_actual)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${
                          revVariance !== null && revVariance >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {revVariance !== null ? formatPercent(revVariance) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.ebitda_target)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.ebitda_actual)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${
                          ebitdaVariance !== null && ebitdaVariance >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {ebitdaVariance !== null ? formatPercent(ebitdaVariance) : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
