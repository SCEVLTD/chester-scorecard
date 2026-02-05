/**
 * E-Profile Report Page
 *
 * Shows business performance grouped by E-Profile category.
 * Helps identify if smaller businesses are being masked by larger ones.
 * Admin-only access.
 */

import { useState, useMemo } from 'react'
import { useLocation } from 'wouter'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronDown, AlertTriangle, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useEProfileYearAggregate } from '@/hooks/use-city-aggregate'
import { useBusinesses } from '@/hooks/use-businesses'
import { useLatestScoresPerBusiness } from '@/hooks/use-scorecards'
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

const E_PROFILE_COLORS: Record<EProfile, string> = {
  E0: '#94a3b8',
  E1: '#60a5fa',
  E2: '#34d399',
  E3: '#fbbf24',
  E4: '#f97316',
  E5: '#ef4444',
}

const ALL_PROFILES: EProfile[] = ['E0', 'E1', 'E2', 'E3', 'E4', 'E5']

export function EProfileReportPage() {
  const [, navigate] = useLocation()
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedProfiles, setSelectedProfiles] = useState<Set<EProfile>>(new Set(ALL_PROFILES))
  const [expandedProfiles, setExpandedProfiles] = useState<Set<EProfile>>(new Set())

  const { data: eprofileData, isLoading } = useEProfileYearAggregate(selectedYear)
  const { data: businesses } = useBusinesses()
  const { data: latestScores } = useLatestScoresPerBusiness()

  // Toggle profile filter
  const toggleProfile = (profile: EProfile) => {
    const newSet = new Set(selectedProfiles)
    if (newSet.has(profile)) {
      newSet.delete(profile)
    } else {
      newSet.add(profile)
    }
    setSelectedProfiles(newSet)
  }

  // Toggle expanded profile
  const toggleExpanded = (profile: EProfile) => {
    const newSet = new Set(expandedProfiles)
    if (newSet.has(profile)) {
      newSet.delete(profile)
    } else {
      newSet.add(profile)
    }
    setExpandedProfiles(newSet)
  }

  // Calculate YTD aggregates by E-Profile
  const profileAggregates = useMemo(() => {
    if (!eprofileData) return []

    // Group by E-Profile and sum across all months
    const byProfile = new Map<EProfile, {
      revenue_actual: number
      revenue_target: number
      ebitda_actual: number
      ebitda_target: number
      business_count: number
    }>()

    eprofileData.forEach((row) => {
      const existing = byProfile.get(row.e_profile) || {
        revenue_actual: 0,
        revenue_target: 0,
        ebitda_actual: 0,
        ebitda_target: 0,
        business_count: row.business_count,
      }
      byProfile.set(row.e_profile, {
        revenue_actual: existing.revenue_actual + row.total_revenue_actual,
        revenue_target: existing.revenue_target + row.total_revenue_target,
        ebitda_actual: existing.ebitda_actual + row.total_ebitda_actual,
        ebitda_target: existing.ebitda_target + row.total_ebitda_target,
        business_count: row.business_count, // Take latest count
      })
    })

    return ALL_PROFILES
      .filter((p) => byProfile.has(p) && selectedProfiles.has(p))
      .map((profile) => {
        const data = byProfile.get(profile)!
        return {
          profile,
          label: E_PROFILE_LABELS[profile],
          ...data,
          revenue_variance_pct:
            data.revenue_target > 0
              ? ((data.revenue_actual - data.revenue_target) / data.revenue_target) * 100
              : null,
          ebitda_pct:
            data.revenue_actual > 0
              ? (data.ebitda_actual / data.revenue_actual) * 100
              : null,
        }
      })
  }, [eprofileData, selectedProfiles])

  // Get businesses grouped by E-Profile
  const businessesByProfile = useMemo(() => {
    if (!businesses) return new Map<EProfile, typeof businesses>()
    const grouped = new Map<EProfile, typeof businesses>()
    businesses.forEach((b) => {
      if (b.e_profile) {
        const list = grouped.get(b.e_profile as EProfile) || []
        list.push(b)
        grouped.set(b.e_profile as EProfile, list)
      }
    })
    return grouped
  }, [businesses])

  // Calculate totals
  const totals = useMemo(() => {
    return profileAggregates.reduce(
      (acc, p) => ({
        revenue_actual: acc.revenue_actual + p.revenue_actual,
        revenue_target: acc.revenue_target + p.revenue_target,
        ebitda_actual: acc.ebitda_actual + p.ebitda_actual,
        ebitda_target: acc.ebitda_target + p.ebitda_target,
        business_count: acc.business_count + p.business_count,
      }),
      { revenue_actual: 0, revenue_target: 0, ebitda_actual: 0, ebitda_target: 0, business_count: 0 }
    )
  }, [profileAggregates])

  // Chart data for E-Profile distribution
  const chartData = useMemo(() => {
    return profileAggregates.map((p) => ({
      name: p.profile,
      businesses: p.business_count,
      revenue: p.revenue_actual,
    }))
  }, [profileAggregates])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        backTo="/portfolio"
        actions={
          <Select
            value={selectedYear.toString()}
            onValueChange={(v) => setSelectedYear(parseInt(v))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear, currentYear - 1].map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <h1 className="text-2xl font-bold text-center">E-Profile Analysis</h1>
      <p className="text-center text-muted-foreground mb-4">Business performance grouped by revenue category</p>

      {/* E-Profile Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filter by E-Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {ALL_PROFILES.map((profile) => (
              <div key={profile} className="flex items-center space-x-2">
                <Checkbox
                  id={profile}
                  checked={selectedProfiles.has(profile)}
                  onCheckedChange={() => toggleProfile(profile)}
                />
                <label
                  htmlFor={profile}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {profile} - {E_PROFILE_LABELS[profile]}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Distribution Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>E-Profile Distribution</CardTitle>
            <CardDescription>Business count and revenue by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#22c55e"
                    tickFormatter={(value) => formatCurrency(value, true)}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === 'YTD Revenue' || name === 'revenue') {
                        return formatCurrency(value as number)
                      }
                      return value
                    }}
                    labelFormatter={(label) => `E-Profile: ${label}`}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="businesses"
                    name="Businesses"
                    fill="#3b82f6"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="revenue"
                    name="YTD Revenue"
                    fill="#22c55e"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Chester Portfolio Mix</CardTitle>
            <CardDescription>Business distribution by E-Profile</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="businesses"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={E_PROFILE_COLORS[entry.name as EProfile]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _name, props) => {
                      const payload = props.payload as { name: string; revenue: number } | undefined
                      return [
                        `${value} businesses (${formatCurrency(payload?.revenue)})`,
                        payload?.name ?? '',
                      ]
                    }}
                  />
                  <Legend
                    formatter={(_value, entry) => {
                      const payload = entry.payload as { name?: string } | undefined
                      const profile = (payload?.name ?? '') as EProfile
                      return `${profile} - ${E_PROFILE_LABELS[profile] || ''}`
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aggregate Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by E-Profile</CardTitle>
          <CardDescription>YTD aggregates for {selectedYear}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-Profile</TableHead>
                <TableHead className="text-right"># Businesses</TableHead>
                <TableHead className="text-right">Rev Target</TableHead>
                <TableHead className="text-right">Rev Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">EBITDA</TableHead>
                <TableHead className="text-right">EBITDA %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profileAggregates.map((p) => (
                <Collapsible key={p.profile} asChild>
                  <>
                    <CollapsibleTrigger asChild>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleExpanded(p.profile)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                expandedProfiles.has(p.profile) ? 'rotate-180' : ''
                              }`}
                            />
                            <Badge
                              style={{ backgroundColor: E_PROFILE_COLORS[p.profile] }}
                              className="text-white"
                            >
                              {p.profile}
                            </Badge>
                            <span className="text-muted-foreground text-sm">{p.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{p.business_count}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.revenue_target, true)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.revenue_actual, true)}</TableCell>
                        <TableCell
                          className={`text-right ${
                            p.revenue_variance_pct !== null && p.revenue_variance_pct >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {p.revenue_variance_pct !== null ? formatPercent(p.revenue_variance_pct) : '-'}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(p.ebitda_actual, true)}</TableCell>
                        <TableCell className="text-right">
                          {p.ebitda_pct !== null ? `${p.ebitda_pct.toFixed(1)}%` : '-'}
                        </TableCell>
                      </TableRow>
                    </CollapsibleTrigger>
                    <CollapsibleContent asChild>
                      <>
                        {expandedProfiles.has(p.profile) &&
                          businessesByProfile.get(p.profile)?.map((business) => {
                            const score = latestScores?.get(business.id)
                            return (
                              <TableRow
                                key={business.id}
                                className="bg-muted/30 text-sm"
                              >
                                <TableCell className="pl-12">
                                  <div className="flex items-center gap-2">
                                    {business.name}
                                    {score && score.rag_status === 'red' && (
                                      <AlertTriangle className="h-4 w-4 text-red-500" />
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">-</TableCell>
                                <TableCell className="text-right text-muted-foreground">-</TableCell>
                                <TableCell className="text-right text-muted-foreground">-</TableCell>
                                <TableCell className="text-right">
                                  {score ? (
                                    <Badge
                                      variant={
                                        score.rag_status === 'green'
                                          ? 'default'
                                          : score.rag_status === 'amber'
                                          ? 'secondary'
                                          : 'destructive'
                                      }
                                    >
                                      {score.total_score}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">No scorecard</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">-</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigate(`/business/${business.id}`)
                                    }}
                                  >
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                      </>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))}
              {/* Totals row */}
              <TableRow className="font-bold border-t-2">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{totals.business_count}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.revenue_target, true)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.revenue_actual, true)}</TableCell>
                <TableCell
                  className={`text-right ${
                    totals.revenue_target > 0 &&
                    ((totals.revenue_actual - totals.revenue_target) / totals.revenue_target) * 100 >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {totals.revenue_target > 0
                    ? formatPercent(
                        ((totals.revenue_actual - totals.revenue_target) / totals.revenue_target) * 100
                      )
                    : '-'}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(totals.ebitda_actual, true)}</TableCell>
                <TableCell className="text-right">
                  {totals.revenue_actual > 0
                    ? `${((totals.ebitda_actual / totals.revenue_actual) * 100).toFixed(1)}%`
                    : '-'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Small Business Alert */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Attention: Smaller Business Performance
          </CardTitle>
          <CardDescription>
            Businesses in E0 and E1 categories that may need additional support
          </CardDescription>
        </CardHeader>
        <CardContent>
          {businessesByProfile.get('E0')?.length || businessesByProfile.get('E1')?.length ? (
            <div className="space-y-4">
              {['E0', 'E1'].map((profile) => {
                const profileBusinesses = businessesByProfile.get(profile as EProfile)
                if (!profileBusinesses?.length) return null
                return (
                  <div key={profile}>
                    <h4 className="font-medium mb-2">
                      {profile} - {E_PROFILE_LABELS[profile as EProfile]}
                    </h4>
                    <div className="space-y-2">
                      {profileBusinesses.map((b) => {
                        const score = latestScores?.get(b.id)
                        const needsAttention = !score || score.rag_status === 'red' || score.rag_status === 'amber'
                        return (
                          <div
                            key={b.id}
                            className={`flex items-center justify-between p-2 rounded ${
                              needsAttention ? 'bg-amber-50' : 'bg-muted/30'
                            }`}
                          >
                            <span>{b.name}</span>
                            <div className="flex items-center gap-2">
                              {score ? (
                                <Badge
                                  variant={
                                    score.rag_status === 'green'
                                      ? 'default'
                                      : score.rag_status === 'amber'
                                      ? 'secondary'
                                      : 'destructive'
                                  }
                                >
                                  Score: {score.total_score}
                                </Badge>
                              ) : (
                                <Badge variant="outline">No scorecard</Badge>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/business/${b.id}`)}
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-muted-foreground">No businesses in E0 or E1 categories.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
