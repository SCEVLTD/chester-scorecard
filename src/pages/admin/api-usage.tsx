import React, { useMemo } from 'react'
import { useLocation } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import { format, subDays, startOfDay, startOfWeek, startOfMonth, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Home, Activity, Cpu, PoundSterling } from 'lucide-react'

// ------------------------------------------------------------------
// Pricing constants (Claude Sonnet)
// ------------------------------------------------------------------
const INPUT_COST_PER_MILLION_USD = 3
const OUTPUT_COST_PER_MILLION_USD = 15
const USD_TO_GBP = 0.79

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface AuditLogEntry {
  id: string
  user_id: string | null
  user_email: string | null
  user_role: string | null
  action: string
  resource_type: string
  resource_id: string | null
  metadata: {
    function?: string
    model?: string
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    callCount?: number
  }
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

interface FunctionBreakdown {
  functionName: string
  callCount: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCostGbp: number
}

interface DailyUsage {
  date: string
  totalTokens: number
  inputTokens: number
  outputTokens: number
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function calculateCostGbp(inputTokens: number, outputTokens: number): number {
  const inputCostUsd = (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION_USD
  const outputCostUsd = (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION_USD
  return (inputCostUsd + outputCostUsd) * USD_TO_GBP
}

function formatGbp(amount: number): string {
  return `\u00a3${amount.toFixed(2)}`
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}k`
  }
  return tokens.toLocaleString()
}

function getFunctionDisplayName(fn: string): string {
  const names: Record<string, string> = {
    'generate-analysis': 'Scorecard Analysis',
    'generate-portfolio-analysis': 'Portfolio Analysis',
    'generate-meeting-summary': 'Meeting Summary',
  }
  return names[fn] || fn
}

// ------------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------------

function CostSummaryCard({
  title,
  totalTokens,
  costGbp,
  callCount,
}: {
  title: string
  totalTokens: number
  costGbp: number
  callCount: number
}): React.ReactNode {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1">
          <PoundSterling className="h-3.5 w-3.5" />
          {title}
        </CardDescription>
        <CardTitle className="text-2xl tabular-nums">
          {formatGbp(costGbp)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{formatTokens(totalTokens)} tokens</span>
          <span>{callCount} {callCount === 1 ? 'call' : 'calls'}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ------------------------------------------------------------------
// Main component
// ------------------------------------------------------------------

export function ApiUsagePage(): React.ReactNode {
  const [, navigate] = useLocation()
  const { userRole } = useAuth()

  // Page protection: super_admin only
  if (userRole !== 'super_admin') {
    return (
      <div className="min-h-screen bg-background p-8 text-center">
        <h1 className="text-xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground mt-2">Only super admins can view API usage data.</p>
      </div>
    )
  }

  // Fetch all anthropic_api_usage entries from the last 30 days
  const thirtyDaysAgo = startOfDay(subDays(new Date(), 30)).toISOString()

  const { data: auditEntries, isLoading, isError } = useQuery({
    queryKey: ['api-usage', thirtyDaysAgo],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('action', 'anthropic_api_usage')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })

      if (error) {
        toast.error('Failed to load API usage data')
        throw error
      }
      return (data ?? []) as AuditLogEntry[]
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })

  // ------------------------------------------------------------------
  // Derived data
  // ------------------------------------------------------------------

  const entries = auditEntries ?? []

  const todayStart = startOfDay(new Date()).toISOString()
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()
  const monthStart = startOfMonth(new Date()).toISOString()

  const { todayStats, weekStats, monthStats } = useMemo(() => {
    const aggregate = (items: AuditLogEntry[]) => {
      let inputTokens = 0
      let outputTokens = 0
      let totalTokens = 0
      for (const entry of items) {
        inputTokens += entry.metadata?.inputTokens ?? 0
        outputTokens += entry.metadata?.outputTokens ?? 0
        totalTokens += entry.metadata?.totalTokens ?? 0
      }
      return {
        inputTokens,
        outputTokens,
        totalTokens,
        costGbp: calculateCostGbp(inputTokens, outputTokens),
        callCount: items.length,
      }
    }

    return {
      todayStats: aggregate(entries.filter(e => e.created_at >= todayStart)),
      weekStats: aggregate(entries.filter(e => e.created_at >= weekStart)),
      monthStats: aggregate(entries.filter(e => e.created_at >= monthStart)),
    }
  }, [entries, todayStart, weekStart, monthStart])

  // Usage by function
  const functionBreakdown: FunctionBreakdown[] = useMemo(() => {
    const map = new Map<string, FunctionBreakdown>()

    for (const entry of entries) {
      const fn = entry.metadata?.function ?? 'unknown'
      const existing = map.get(fn) ?? {
        functionName: fn,
        callCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostGbp: 0,
      }

      existing.callCount += entry.metadata?.callCount ?? 1
      existing.inputTokens += entry.metadata?.inputTokens ?? 0
      existing.outputTokens += entry.metadata?.outputTokens ?? 0
      existing.totalTokens += entry.metadata?.totalTokens ?? 0
      existing.estimatedCostGbp = calculateCostGbp(existing.inputTokens, existing.outputTokens)

      map.set(fn, existing)
    }

    return Array.from(map.values()).sort((a, b) => b.totalTokens - a.totalTokens)
  }, [entries])

  // Daily usage chart data (last 30 days)
  const dailyUsage: DailyUsage[] = useMemo(() => {
    const map = new Map<string, DailyUsage>()

    // Pre-populate all 30 days so the chart has no gaps
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
      map.set(date, { date, totalTokens: 0, inputTokens: 0, outputTokens: 0 })
    }

    for (const entry of entries) {
      const date = format(new Date(entry.created_at), 'yyyy-MM-dd')
      const existing = map.get(date)
      if (existing) {
        existing.totalTokens += entry.metadata?.totalTokens ?? 0
        existing.inputTokens += entry.metadata?.inputTokens ?? 0
        existing.outputTokens += entry.metadata?.outputTokens ?? 0
      }
    }

    return Array.from(map.values())
  }, [entries])

  // Recent calls (last 20 -- data already ordered by created_at desc)
  const recentCalls = entries.slice(0, 20)

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-10" />
          </div>
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-80" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Failed to load API usage data. Please try again.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            title="Go to home"
          >
            <Home className="h-5 w-5" />
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            API Usage Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Anthropic API token consumption and estimated costs
          </p>
        </div>

        {/* Cost Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CostSummaryCard
            title="Today"
            totalTokens={todayStats.totalTokens}
            costGbp={todayStats.costGbp}
            callCount={todayStats.callCount}
          />
          <CostSummaryCard
            title="This Week"
            totalTokens={weekStats.totalTokens}
            costGbp={weekStats.costGbp}
            callCount={weekStats.callCount}
          />
          <CostSummaryCard
            title="This Month"
            totalTokens={monthStats.totalTokens}
            costGbp={monthStats.costGbp}
            callCount={monthStats.callCount}
          />
        </div>

        {/* Tabs: Chart, By Function, Recent Calls */}
        <Tabs defaultValue="chart">
          <TabsList>
            <TabsTrigger value="chart">Daily Usage</TabsTrigger>
            <TabsTrigger value="functions">By Function</TabsTrigger>
            <TabsTrigger value="recent">Recent Calls</TabsTrigger>
          </TabsList>

          {/* Daily Usage Chart */}
          <TabsContent value="chart">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Daily Token Usage (Last 30 Days)</CardTitle>
                <CardDescription>
                  Total tokens consumed per day across all AI functions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dailyUsage.every(d => d.totalTokens === 0) ? (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    No usage data in the last 30 days
                  </div>
                ) : (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyUsage} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v: string) => format(new Date(v), 'd MMM')}
                          tick={{ fontSize: 12 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tickFormatter={(v: number) => formatTokens(v)}
                          tick={{ fontSize: 12 }}
                          width={60}
                        />
                        <Tooltip
                          labelFormatter={(v) => format(new Date(String(v)), 'dd MMM yyyy')}
                          formatter={(value, name) => {
                            const label = name === 'inputTokens' ? 'Input' : name === 'outputTokens' ? 'Output' : 'Total'
                            return [Number(value).toLocaleString(), label]
                          }}
                          contentStyle={{
                            borderRadius: '8px',
                            border: '1px solid hsl(var(--border))',
                            backgroundColor: 'hsl(var(--background))',
                            fontSize: '12px',
                          }}
                        />
                        <Bar
                          dataKey="inputTokens"
                          stackId="tokens"
                          fill="hsl(210, 80%, 55%)"
                          name="inputTokens"
                          radius={[0, 0, 0, 0]}
                        />
                        <Bar
                          dataKey="outputTokens"
                          stackId="tokens"
                          fill="hsl(340, 75%, 55%)"
                          name="outputTokens"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="flex items-center justify-center gap-6 mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsl(210, 80%, 55%)' }} />
                    Input Tokens
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsl(340, 75%, 55%)' }} />
                    Output Tokens
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage by Function */}
          <TabsContent value="functions">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Usage by Function</CardTitle>
                <CardDescription>
                  Token consumption grouped by AI function (last 30 days)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {functionBreakdown.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    No usage data in the last 30 days
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Function</TableHead>
                        <TableHead className="text-right">Calls</TableHead>
                        <TableHead className="text-right">Input Tokens</TableHead>
                        <TableHead className="text-right">Output Tokens</TableHead>
                        <TableHead className="text-right">Total Tokens</TableHead>
                        <TableHead className="text-right">Est. Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {functionBreakdown.map((row) => (
                        <TableRow key={row.functionName}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Cpu className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{getFunctionDisplayName(row.functionName)}</span>
                              <Badge variant="secondary" className="text-xs">
                                {row.functionName}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{row.callCount}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatTokens(row.inputTokens)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatTokens(row.outputTokens)}</TableCell>
                          <TableCell className="text-right tabular-nums font-medium">{formatTokens(row.totalTokens)}</TableCell>
                          <TableCell className="text-right tabular-nums font-medium">{formatGbp(row.estimatedCostGbp)}</TableCell>
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {functionBreakdown.reduce((sum, r) => sum + r.callCount, 0)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatTokens(functionBreakdown.reduce((sum, r) => sum + r.inputTokens, 0))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatTokens(functionBreakdown.reduce((sum, r) => sum + r.outputTokens, 0))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatTokens(functionBreakdown.reduce((sum, r) => sum + r.totalTokens, 0))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatGbp(functionBreakdown.reduce((sum, r) => sum + r.estimatedCostGbp, 0))}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent API Calls */}
          <TabsContent value="recent">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent API Calls</CardTitle>
                <CardDescription>
                  Last 20 Anthropic API calls
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentCalls.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    No recent API calls
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Function</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead className="text-right">Input</TableHead>
                          <TableHead className="text-right">Output</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Est. Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentCalls.map((entry) => {
                          const inputTokens = entry.metadata?.inputTokens ?? 0
                          const outputTokens = entry.metadata?.outputTokens ?? 0
                          const totalTokens = entry.metadata?.totalTokens ?? 0
                          const costGbp = calculateCostGbp(inputTokens, outputTokens)

                          return (
                            <TableRow key={entry.id}>
                              <TableCell className="whitespace-nowrap">
                                <div className="text-sm">{format(new Date(entry.created_at), 'dd MMM yyyy')}</div>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(entry.created_at), 'HH:mm:ss')}
                                  {' '}
                                  <span title={format(new Date(entry.created_at), 'dd MMM yyyy HH:mm:ss')}>
                                    ({formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })})
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {getFunctionDisplayName(entry.metadata?.function ?? 'unknown')}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm truncate max-w-[200px]" title={entry.user_email ?? 'Unknown'}>
                                {entry.user_email ?? 'Unknown'}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-sm">
                                {inputTokens.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-sm">
                                {outputTokens.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-sm font-medium">
                                {totalTokens.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-sm font-medium">
                                {formatGbp(costGbp)}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
