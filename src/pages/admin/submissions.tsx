import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { useBusinesses } from '@/hooks/use-businesses'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, XCircle, AlertCircle, FileText } from 'lucide-react'

interface SubmissionRow {
  business_id: string
  month: string
  revenue_target: number | null
  revenue_actual: number | null
  net_profit_target: number | null
  net_profit_actual: number | null
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return '-'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function SubmissionsPage() {
  const { userRole } = useAuth()
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Super admin only
  if (userRole !== 'super_admin') {
    return (
      <div className="min-h-screen bg-background p-8 text-center">
        <h1 className="text-xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground mt-2">Only super admins can view submission data.</p>
      </div>
    )
  }

  const { data: businesses } = useBusinesses()

  // Get all available months from data_requests
  const { data: availableMonths } = useQuery({
    queryKey: ['submission-months'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('data_requests')
        .select('month')
        .order('month', { ascending: false })
      if (error) throw error
      const unique = [...new Set((data || []).map((d) => d.month))]
      return unique
    },
  })

  // Get all submissions for the selected month
  const { data: submissions, isLoading } = useQuery({
    queryKey: ['submission-overview', selectedMonth],
    queryFn: async (): Promise<SubmissionRow[]> => {
      const { data, error } = await supabase
        .from('company_submissions')
        .select(`
          revenue_actual,
          revenue_target,
          net_profit_actual,
          net_profit_target,
          data_requests!inner(
            month,
            business_id
          )
        `)
        .eq('data_requests.month', selectedMonth)

      if (error) throw error

      return (data || []).map((row) => {
        const dr = row.data_requests as unknown as { month: string; business_id: string }
        return {
          business_id: dr.business_id,
          month: dr.month,
          revenue_target: row.revenue_target,
          revenue_actual: row.revenue_actual,
          net_profit_target: row.net_profit_target,
          net_profit_actual: row.net_profit_actual,
        }
      })
    },
    enabled: !!selectedMonth,
  })

  // Build submission lookup by business_id
  const submissionMap = useMemo(() => {
    const map = new Map<string, SubmissionRow>()
    if (submissions) {
      for (const s of submissions) {
        map.set(s.business_id, s)
      }
    }
    return map
  }, [submissions])

  // Sort businesses alphabetically (test businesses already excluded by hook)
  const displayBusinesses = useMemo(() => {
    if (!businesses) return []
    return [...businesses].sort((a, b) => a.name.localeCompare(b.name))
  }, [businesses])

  // Summary stats
  const stats = useMemo(() => {
    if (!displayBusinesses) return { total: 0, submitted: 0, withTargets: 0, withActuals: 0, noSubmission: 0 }
    const total = displayBusinesses.length
    let submitted = 0
    let withTargets = 0
    let withActuals = 0
    for (const b of displayBusinesses) {
      const sub = submissionMap.get(b.id)
      if (sub) {
        submitted++
        if (sub.revenue_target && sub.revenue_target > 0) withTargets++
        if (sub.revenue_actual && sub.revenue_actual > 0) withActuals++
      }
    }
    return { total, submitted, withTargets, withActuals, noSubmission: total - submitted }
  }, [displayBusinesses, submissionMap])

  const monthLabel = selectedMonth
    ? new Date(selectedMonth + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : ''

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader backTo="/" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Submission Overview</h1>
          <p className="text-muted-foreground">All company submissions for {monthLabel}</p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {availableMonths?.map((month) => (
              <SelectItem key={month} value={month}>
                {new Date(month + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Businesses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.withActuals}</div>
            <p className="text-xs text-muted-foreground">With Actuals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.withTargets}</div>
            <p className="text-xs text-muted-foreground">With Targets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.noSubmission}</div>
            <p className="text-xs text-muted-foreground">No Submission</p>
          </CardContent>
        </Card>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {monthLabel} Submissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>E-Profile</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Rev Target</TableHead>
                    <TableHead className="text-right">Rev Actual</TableHead>
                    <TableHead className="text-right">EBITDA Target</TableHead>
                    <TableHead className="text-right">EBITDA Actual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayBusinesses.map((business) => {
                    const sub = submissionMap.get(business.id)
                    const hasTargets = sub && sub.revenue_target && sub.revenue_target > 0
                    const hasActuals = sub && sub.revenue_actual && sub.revenue_actual > 0

                    let statusBadge
                    if (hasActuals) {
                      statusBadge = (
                        <Badge className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Complete
                        </Badge>
                      )
                    } else if (hasTargets) {
                      statusBadge = (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Targets Only
                        </Badge>
                      )
                    } else if (sub) {
                      statusBadge = (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Empty
                        </Badge>
                      )
                    } else {
                      statusBadge = (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Missing
                        </Badge>
                      )
                    }

                    return (
                      <TableRow key={business.id}>
                        <TableCell className="font-medium">{business.name}</TableCell>
                        <TableCell>
                          {business.e_profile ? (
                            <Badge variant="outline">{business.e_profile}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{statusBadge}</TableCell>
                        <TableCell className="text-right">{formatCurrency(sub?.revenue_target)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(sub?.revenue_actual)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(sub?.net_profit_target)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(sub?.net_profit_actual)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
