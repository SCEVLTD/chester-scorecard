import { useState } from 'react'
import { useLocation } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  ArrowLeft,
  Home,
  Shield,
  ShieldAlert,
  Activity,
  AlertTriangle,
  Clock,
} from 'lucide-react'

type FilterCategory = 'all' | 'logins' | 'ai' | 'data' | 'admin'

interface AuditEntry {
  id: string
  user_id: string | null
  user_email: string | null
  user_role: string | null
  action: string
  resource_type: string
  resource_id: string | null
  metadata: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

const ACTION_FILTERS: Record<FilterCategory, string[] | null> = {
  all: null,
  logins: ['login_success', 'login_failed'],
  ai: [
    'generate_analysis',
    'generate_portfolio_analysis',
    'generate_meeting_summary',
    'anthropic_api_usage',
  ],
  data: ['data_access', 'data_export', 'scorecard_view', 'scorecard_create', 'scorecard_update'],
  admin: [
    'admin_invite',
    'admin_remove',
    'role_change',
    'business_create',
    'business_delete',
    'settings_update',
  ],
}

function getActionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (action === 'login_failed') return 'destructive'
  if (action.startsWith('generate_') || action === 'anthropic_api_usage') return 'default'
  if (action.startsWith('admin_') || action === 'role_change') return 'secondary'
  return 'outline'
}

function formatRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return dateStr
  }
}

export function SecurityPage(): React.ReactElement {
  const [, navigate] = useLocation()
  const { userRole } = useAuth()
  const [filter, setFilter] = useState<FilterCategory>('all')

  // Page protection: super_admin only
  if (userRole !== 'super_admin') {
    return (
      <div className="min-h-screen bg-background p-8 text-center">
        <h1 className="text-xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground mt-2">Only super admins can view security information.</p>
      </div>
    )
  }

  // Fetch audit log entries
  const { data: auditEntries, isLoading: auditLoading } = useQuery({
    queryKey: ['audit-log', filter],
    queryFn: async (): Promise<AuditEntry[]> => {
      let query = supabase
        .from('audit_log' as never)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      const filterActions = ACTION_FILTERS[filter]
      if (filterActions) {
        query = query.in('action', filterActions)
      }

      const { data, error } = await query
      if (error) throw error
      return (data as unknown as AuditEntry[]) ?? []
    },
  })

  // Stats: total events last 24h
  const { data: totalEvents24h } = useQuery({
    queryKey: ['audit-stats-total'],
    queryFn: async (): Promise<number> => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count, error } = await supabase
        .from('audit_log' as never)
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since)
      if (error) throw error
      return count ?? 0
    },
  })

  // Stats: failed logins last 24h
  const { data: failedLogins24h } = useQuery({
    queryKey: ['audit-stats-failed-logins'],
    queryFn: async (): Promise<number> => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count, error } = await supabase
        .from('audit_log' as never)
        .select('*', { count: 'exact', head: true })
        .eq('action', 'login_failed')
        .gte('created_at', since)
      if (error) throw error
      return count ?? 0
    },
  })

  // Stats: AI generations last 24h
  const { data: aiGenerations24h } = useQuery({
    queryKey: ['audit-stats-ai'],
    queryFn: async (): Promise<number> => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count, error } = await supabase
        .from('audit_log' as never)
        .select('*', { count: 'exact', head: true })
        .like('action', 'generate_%')
        .gte('created_at', since)
      if (error) throw error
      return count ?? 0
    },
  })

  // Stats: rate limit hits last 24h
  const { data: rateLimitHits24h } = useQuery({
    queryKey: ['audit-stats-rate-limits'],
    queryFn: async (): Promise<number> => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from('rate_limits' as never)
        .select('count')
        .gte('window_start', since)
      if (error) throw error
      const entries = data as unknown as { count: number }[] | null
      if (!entries || entries.length === 0) return 0
      return entries.reduce((sum: number, row: { count: number }) => sum + (row.count ?? 0), 0)
    },
  })

  // Recent failed logins (last 10)
  const { data: recentFailedLogins } = useQuery({
    queryKey: ['audit-failed-logins-recent'],
    queryFn: async (): Promise<AuditEntry[]> => {
      const { data, error } = await supabase
        .from('audit_log' as never)
        .select('*')
        .eq('action', 'login_failed')
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return (data as unknown as AuditEntry[]) ?? []
    },
  })

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
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
          <div className="ml-2">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Overview
            </h1>
            <p className="text-xs text-muted-foreground">
              Audit log, login attempts, and system activity
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Activity className="h-4 w-4" />
                <span className="text-xs font-medium">Events (24h)</span>
              </div>
              {totalEvents24h !== undefined ? (
                <p className="text-2xl font-bold">{totalEvents24h}</p>
              ) : (
                <Skeleton className="h-8 w-16" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <ShieldAlert className="h-4 w-4" />
                <span className="text-xs font-medium">Failed Logins (24h)</span>
              </div>
              {failedLogins24h !== undefined ? (
                <p className={`text-2xl font-bold ${(failedLogins24h ?? 0) > 0 ? 'text-destructive' : ''}`}>
                  {failedLogins24h}
                </p>
              ) : (
                <Skeleton className="h-8 w-16" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium">AI Generations (24h)</span>
              </div>
              {aiGenerations24h !== undefined ? (
                <p className="text-2xl font-bold">{aiGenerations24h}</p>
              ) : (
                <Skeleton className="h-8 w-16" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-medium">Rate Limit Hits (24h)</span>
              </div>
              {rateLimitHits24h !== undefined ? (
                <p className={`text-2xl font-bold ${(rateLimitHits24h ?? 0) > 0 ? 'text-amber-600' : ''}`}>
                  {rateLimitHits24h}
                </p>
              ) : (
                <Skeleton className="h-8 w-16" />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Audit Log */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Audit Log</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterCategory)}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="logins">Logins</TabsTrigger>
                <TabsTrigger value="ai">AI Generation</TabsTrigger>
                <TabsTrigger value="data">Data Access</TabsTrigger>
                <TabsTrigger value="admin">Admin Actions</TabsTrigger>
              </TabsList>

              <TabsContent value={filter}>
                {auditLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : auditEntries && auditEntries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[140px]">Time</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead className="hidden md:table-cell">Resource</TableHead>
                          <TableHead className="hidden lg:table-cell">IP Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatRelativeTime(entry.created_at)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {entry.user_email || (
                                <span className="text-muted-foreground italic">System</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getActionBadgeVariant(entry.action)} className="text-xs">
                                {entry.action.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {entry.resource_type}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground font-mono">
                              {entry.ip_address || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">
                      No audit entries found{filter !== 'all' ? ' for this category' : ''}.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Recent Failed Logins */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              Recent Failed Logins
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentFailedLogins && recentFailedLogins.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentFailedLogins.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">
                        {entry.user_email || (
                          <span className="text-muted-foreground italic">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {entry.ip_address || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(entry.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No failed login attempts recorded.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
