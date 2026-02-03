/**
 * Portfolio Dashboard Page
 *
 * Provides an overview of all businesses with their current scores,
 * trends, and anomaly highlighting. Includes both card and heatmap views.
 */

import { useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, AlertTriangle, GitCompare, Sparkles, Loader2, X, FileText, Pencil, Mail, Link2, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { TrendIndicator } from '@/components/trend-indicator'
import { PortfolioHeatmap } from '@/components/portfolio/portfolio-heatmap'
import { PortfolioAnalysisCard } from '@/components/portfolio/portfolio-analysis-card'
import { MeetingSummaryCard } from '@/components/meeting-summary-card'
import { PendingActionsBadge } from '@/components/pending-actions-badge'
import { SubmissionStatusPanel } from '@/components/submission-status-panel'
import { CompanyEditDialog } from '@/components/admin/company-edit-dialog'
import { BulkInvitationPanel } from '@/components/admin/bulk-invitation-panel'
import { PortfolioActionModal } from '@/components/admin/portfolio-action-modal'
import { BatchExportButton } from '@/components/batch-export-button'
import { usePortfolioSummary } from '@/hooks/use-portfolio-summary'
import { useGeneratePortfolioAnalysis } from '@/hooks/use-portfolio-analysis'
import { useGenerateMeetingSummary } from '@/hooks/use-meeting-summary'
import { useBusinesses, useDeleteBusiness } from '@/hooks/use-businesses'
import { useAuth } from '@/contexts/auth-context'
import type { PortfolioAnalysis } from '@/schemas/portfolio-analysis'
import type { MeetingSummary } from '@/schemas/meeting-summary'
import type { Business } from '@/types/database.types'
import { useSectors } from '@/hooks/use-sectors'
import { supabase } from '@/lib/supabase'
import type { Scorecard } from '@/types/database.types'
import { aggregatePortfolio } from '@/lib/portfolio-aggregator'

const ragColors: Record<string, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
}

export function PortfolioPage() {
  const [, navigate] = useLocation()
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined)
  const { data: portfolio, isLoading } = usePortfolioSummary(selectedMonth)
  const { data: sectors } = useSectors()
  const { data: allBusinesses } = useBusinesses()
  const { userRole } = useAuth()
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null)
  const [meetingSummary, setMeetingSummary] = useState<MeetingSummary | null>(null)
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null)
  const [actionModalOpen, setActionModalOpen] = useState(false)
  const generateAnalysis = useGeneratePortfolioAnalysis()
  const generateMeetingSummary = useGenerateMeetingSummary()
  const deleteBusiness = useDeleteBusiness()

  const sendLoginLink = (businessName: string, email: string | null) => {
    const loginUrl = `${window.location.origin}/company/login`
    if (email) {
      const subject = encodeURIComponent(`Your Chester Business Scorecard Access - ${businessName}`)
      const body = encodeURIComponent(`Hi,\n\nYou can access your ${businessName} business scorecard using the link below:\n\n${loginUrl}\n\nSimply enter your email address and we'll send you a secure login link.\n\nThanks`)
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
      toast.success(`Opening email for ${businessName}`)
    } else {
      navigator.clipboard.writeText(loginUrl)
      toast.success(`Login link copied`)
    }
  }

  const handleDeleteBusiness = async (businessId: string, businessName: string) => {
    if (!confirm(`Delete "${businessName}"? This cannot be undone.`)) return
    try {
      await deleteBusiness.mutateAsync(businessId)
      toast.success(`${businessName} deleted`)
    } catch (error) {
      console.error('Failed to delete business:', error)
      toast.error('Failed to delete business')
    }
  }

  // Calculate display month for submission status panel
  const displayMonth = useMemo(() => {
    if (selectedMonth) return selectedMonth
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [selectedMonth])

  const handleGenerateAnalysis = async () => {
    if (!portfolio || portfolio.length === 0) {
      toast.error('No businesses to analyze')
      return
    }
    if (!latestScorecards || latestScorecards.size === 0) {
      toast.error('No scorecard data available')
      return
    }

    try {
      const result = await generateAnalysis.mutateAsync({
        portfolioSummary: portfolio,
        scorecards: latestScorecards,
      })
      setAnalysis(result)
      toast.success('Portfolio analysis generated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate analysis')
    }
  }

  const handleGenerateMeetingSummary = async () => {
    if (!portfolio || portfolio.length === 0) {
      toast.error('No businesses to analyze')
      return
    }
    if (!latestScorecards || latestScorecards.size === 0) {
      toast.error('No scorecard data available')
      return
    }

    try {
      const aggregatedData = aggregatePortfolio(portfolio, latestScorecards)
      const result = await generateMeetingSummary.mutateAsync({ aggregatedData })
      setMeetingSummary(result)
      toast.success('Meeting summary generated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate meeting summary')
    }
  }

  // Fetch full scorecards for heatmap - filtered by selectedMonth
  const { data: latestScorecards, isLoading: isLoadingScorecards } = useQuery({
    queryKey: ['scorecards', 'for-heatmap', selectedMonth],
    queryFn: async () => {
      if (selectedMonth) {
        // Specific month - fetch only that month's scorecards
        const { data, error } = await supabase
          .from('scorecards')
          .select('*')
          .eq('month', selectedMonth)
        if (error) throw error

        const byBusiness = new Map<string, Scorecard>()
        for (const sc of data as Scorecard[]) {
          byBusiness.set(sc.business_id, sc)
        }
        return byBusiness
      } else {
        // Latest per business
        const { data, error } = await supabase
          .from('scorecards')
          .select('*')
          .order('month', { ascending: false })
        if (error) throw error

        // Group by business, keep only latest
        const scorecards = data as Scorecard[]
        const byBusiness = new Map<string, Scorecard>()
        for (const sc of scorecards) {
          if (!byBusiness.has(sc.business_id)) {
            byBusiness.set(sc.business_id, sc)
          }
        }
        return byBusiness
      }
    },
  })

  // Build sector lookup map
  const sectorMap = useMemo(() => {
    if (!sectors) return new Map<string, string>()
    return new Map(sectors.map((s) => [s.id, s.name]))
  }, [sectors])

  // Build business lookup map
  const businessMap = useMemo(() => {
    if (!allBusinesses) return new Map<string, Business>()
    return new Map(allBusinesses.map((b) => [b.id, b]))
  }, [allBusinesses])

  // Extract anomalies (businesses with >10 point score drop)
  const anomalies = useMemo(() => {
    return portfolio?.filter((p) => p.isAnomaly) || []
  }, [portfolio])

  // Build businesses list for heatmap
  const businesses = useMemo(() => {
    if (!portfolio) return []
    return portfolio
      .map((p) => ({ id: p.businessId, name: p.businessName }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [portfolio])

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
      options.push({ value, label })
    }
    return options
  }, [])

  // Build data for batch export
  const scorecardsForExport = useMemo(() => {
    if (!latestScorecards) return []
    return Array.from(latestScorecards.values())
  }, [latestScorecards])

  const businessNamesForExport = useMemo(() => {
    if (!allBusinesses) return new Map<string, string>()
    return new Map(allBusinesses.map(b => [b.id, b.name]))
  }, [allBusinesses])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-muted-foreground">Loading portfolio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            title="Back to home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col items-center flex-1">
            <img src="/velocity-logo.png" alt="Velocity" className="h-8 mb-1" />
            <p className="text-xs text-muted-foreground">Doing good by doing well</p>
          </div>
          <div className="flex-1" />
          {(userRole === 'super_admin' || userRole === 'consultant') && (
            <Button
              variant="outline"
              onClick={() => setActionModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Action
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate('/compare')}
          >
            <GitCompare className="h-4 w-4 mr-2" />
            Compare
          </Button>
          <Button
            variant="outline"
            onClick={handleGenerateMeetingSummary}
            disabled={generateMeetingSummary.isPending || !portfolio?.length}
          >
            {generateMeetingSummary.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Meeting Prep
          </Button>
          <BatchExportButton
            scorecards={scorecardsForExport}
            businessNames={businessNamesForExport}
            disabled={!latestScorecards || latestScorecards.size === 0}
          />
          <Button
            onClick={handleGenerateAnalysis}
            disabled={generateAnalysis.isPending || !portfolio?.length}
          >
            {generateAnalysis.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate AI Analysis
          </Button>
        </div>
        <div className="flex items-center justify-center gap-2 mb-4">
          <h1 className="text-2xl font-bold">Chester Portfolio Overview</h1>
          <PendingActionsBadge />
        </div>

        {/* 20 Business Limit Warning */}
        {portfolio && portfolio.length > 20 && (
          <p className="text-sm text-muted-foreground mb-4">
            First 20 businesses will be analyzed
          </p>
        )}

        {/* AI Analysis Display */}
        {analysis && (
          <div className="mb-6">
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAnalysis(null)}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
            <PortfolioAnalysisCard analysis={analysis} />
          </div>
        )}

        {/* Meeting Summary Display */}
        {meetingSummary && (
          <div className="mb-6">
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMeetingSummary(null)}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
            <MeetingSummaryCard summary={meetingSummary} />
          </div>
        )}

        {/* Submission Status Panel */}
        <div className="mb-6">
          <SubmissionStatusPanel month={displayMonth} />
        </div>

        {/* Bulk Invitation Panel (Admin Only) */}
        {(userRole === 'super_admin' || userRole === 'consultant' || userRole === 'admin') && (
          <div className="mb-6">
            <BulkInvitationPanel />
          </div>
        )}

        {/* Anomaly Alert Section */}
        {anomalies.length > 0 && (
          <Card className="mb-6 border-red-300 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                Attention Required ({anomalies.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {anomalies.map((anomaly) => (
                  <Button
                    key={anomaly.businessId}
                    variant="outline"
                    size="sm"
                    className="border-red-300 hover:bg-red-100"
                    onClick={() => navigate(`/business/${anomaly.businessId}`)}
                  >
                    {anomaly.businessName}
                    {anomaly.trend && (
                      <Badge
                        variant="destructive"
                        className="ml-2"
                      >
                        {anomaly.trend.change}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Month Filter */}
        <div className="flex items-center gap-4 mb-4">
          <label htmlFor="month-filter" className="text-sm font-medium">
            Filter by month:
          </label>
          <Select
            value={selectedMonth ?? 'latest'}
            onValueChange={(value) => setSelectedMonth(value === 'latest' ? undefined : value)}
          >
            <SelectTrigger id="month-filter" className="w-[200px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs for Card and Heatmap views */}
        <Tabs defaultValue="cards" className="mt-6">
          <TabsList>
            <TabsTrigger value="cards">Cards</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            <TabsTrigger value="all">All Businesses ({allBusinesses?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="cards">
            {/* Portfolio Card Grid */}
            {portfolio && portfolio.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
                {portfolio.map((item) => {
                  const sectorName = item.sectorId
                    ? sectorMap.get(item.sectorId)
                    : null
                  const business = businessMap.get(item.businessId)

                  return (
                    <Card
                      key={item.businessId}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => navigate(`/business/${item.businessId}`)}
                          >
                            <div className="flex items-center">
                              <h3 className="font-medium">{item.businessName}</h3>
                              <PendingActionsBadge businessId={item.businessId} />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {sectorName || 'No sector'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={ragColors[item.ragStatus]}>
                              {item.latestScore}
                            </Badge>
                            {(userRole === 'super_admin' || userRole === 'consultant' || userRole === 'admin') && business && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingBusiness(business)
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="mt-2">
                          <TrendIndicator trend={item.trend} />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <p className="text-muted-foreground mt-4">
                No businesses with scorecards yet.
              </p>
            )}
          </TabsContent>

          <TabsContent value="heatmap">
            <Card className="mt-4">
              <CardContent className="pt-4">
                {isLoadingScorecards ? (
                  <p className="text-muted-foreground">Loading heatmap data...</p>
                ) : (
                  <PortfolioHeatmap
                    businesses={businesses}
                    scorecards={latestScorecards ?? new Map()}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card className="mt-4">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  All businesses in the system. Click edit to manage details, emails, and sector.
                </p>
                {allBusinesses && allBusinesses.length > 0 ? (
                  <div className="space-y-2">
                    {allBusinesses.map((business) => {
                      const sectorName = business.sector_id ? sectorMap.get(business.sector_id) : null
                      const scorecard = latestScorecards?.get(business.id)

                      return (
                        <div
                          key={business.id}
                          className="flex items-center gap-2 rounded-md border border-input p-3"
                        >
                          {/* Main business button */}
                          <Button
                            variant="ghost"
                            className="flex-1 justify-start text-left h-auto py-0 px-2 -ml-2"
                            onClick={() => navigate(`/business/${business.id}`)}
                          >
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="font-medium">{business.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {sectorName || 'No sector'}
                              </span>
                            </div>
                          </Button>

                          {/* Send/copy submission link */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              sendLoginLink(business.name, business.contact_email)
                            }}
                            title={business.contact_email ? `Email link to ${business.contact_email}` : 'Copy submission link'}
                          >
                            {business.contact_email ? (
                              <Mail className="h-4 w-4 text-green-600" />
                            ) : (
                              <Link2 className="h-4 w-4 text-blue-600" />
                            )}
                          </Button>

                          {/* Edit button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingBusiness(business)
                            }}
                            title="Edit company details"
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>

                          {/* Delete button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteBusiness(business.id, business.name)
                            }}
                            title="Delete business"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>

                          {/* Score badge if they have one */}
                          {scorecard && (
                            <Badge className={ragColors[scorecard.rag_status]}>
                              {scorecard.total_score}
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No businesses yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Company Edit Dialog */}
        {editingBusiness && (
          <CompanyEditDialog
            business={editingBusiness}
            open={!!editingBusiness}
            onOpenChange={(open) => !open && setEditingBusiness(null)}
          />
        )}

        {/* Portfolio Action Modal */}
        <PortfolioActionModal
          open={actionModalOpen}
          onOpenChange={setActionModalOpen}
        />
      </div>
    </div>
  )
}
