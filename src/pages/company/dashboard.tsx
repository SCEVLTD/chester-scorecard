import { useLocation } from 'wouter'
import { useAuth } from '@/contexts/auth-context'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, TrendingUp, LogOut, ClipboardList, Building2, BarChart3 } from 'lucide-react'
import { format } from 'date-fns'
import type { Business, Scorecard } from '@/types/database.types'

const ragColors: Record<string, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
}

export function CompanyDashboardPage() {
  const [, navigate] = useLocation()
  const { user, businessId, signOut } = useAuth()

  // Get business details
  const { data: business } = useQuery({
    queryKey: ['business', businessId],
    queryFn: async (): Promise<Business | null> => {
      if (!businessId) return null
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single()
      if (error) throw error
      return data as Business
    },
    enabled: !!businessId,
  })

  // Get recent scorecards for this business
  const { data: scorecards } = useQuery({
    queryKey: ['business-scorecards', businessId],
    queryFn: async (): Promise<Scorecard[]> => {
      if (!businessId) return []
      const { data, error } = await supabase
        .from('scorecards')
        .select('*')
        .eq('business_id', businessId)
        .order('month', { ascending: false })
        .limit(6)
      if (error) throw error
      return data as Scorecard[]
    },
    enabled: !!businessId,
  })

  const handleSignOut = async () => {
    await signOut()
    // Use full page reload to ensure auth state is properly cleared
    // (wouter navigate can race with auth state updates)
    window.location.href = '/login'
  }

  if (!businessId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>No Business Linked</CardTitle>
            <CardDescription>
              Your account is not linked to a business yet. Please contact your administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Logged in as: {user?.email}
            </p>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{business?.name || 'Your Business'}</h1>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/company/${businessId}/submit`)}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Submit Monthly Data</h3>
                <p className="text-sm text-muted-foreground">Enter your figures for this month</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/business/${businessId}/performance`)}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Your Performance</h3>
                <p className="text-sm text-muted-foreground">Revenue & EBITDA vs targets</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/city')}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Chester Group Results</h3>
                <p className="text-sm text-muted-foreground">Aggregated group performance</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/business/${businessId}/charts`)}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold">Score Charts</h3>
                <p className="text-sm text-muted-foreground">Scorecard trends over time</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Scorecards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Scorecards
            </CardTitle>
            <CardDescription>Your most recent monthly assessments</CardDescription>
          </CardHeader>
          <CardContent>
            {scorecards && scorecards.length > 0 ? (
              <div className="space-y-3">
                {scorecards.map((sc) => (
                  <div
                    key={sc.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/business/${businessId}/view/${sc.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={ragColors[sc.rag_status]}>
                        {sc.total_score}
                      </Badge>
                      <div>
                        <p className="font-medium">{sc.month}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(sc.created_at), 'dd MMM yyyy')}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground capitalize">
                      {sc.rag_status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No scorecards yet. Submit your first monthly data to get started.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
