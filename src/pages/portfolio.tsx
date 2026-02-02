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
import { ArrowLeft, AlertTriangle, GitCompare, Sparkles, Loader2, X, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { TrendIndicator } from '@/components/trend-indicator'
import { PortfolioHeatmap } from '@/components/portfolio/portfolio-heatmap'
import { PortfolioAnalysisCard } from '@/components/portfolio/portfolio-analysis-card'
import { MeetingSummaryCard } from '@/components/meeting-summary-card'
import { usePortfolioSummary } from '@/hooks/use-portfolio-summary'
import { useGeneratePortfolioAnalysis } from '@/hooks/use-portfolio-analysis'
import { useGenerateMeetingSummary } from '@/hooks/use-meeting-summary'
import type { PortfolioAnalysis } from '@/schemas/portfolio-analysis'
import type { MeetingSummary } from '@/schemas/meeting-summary'
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
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null)
  const [meetingSummary, setMeetingSummary] = useState<MeetingSummary | null>(null)
  const generateAnalysis = useGeneratePortfolioAnalysis()
  const generateMeetingSummary = useGenerateMeetingSummary()

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
        <h1 className="text-2xl font-bold text-center mb-4">Chester Portfolio Overview</h1>

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
          </TabsList>

          <TabsContent value="cards">
            {/* Portfolio Card Grid */}
            {portfolio && portfolio.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
                {portfolio.map((item) => {
                  const sectorName = item.sectorId
                    ? sectorMap.get(item.sectorId)
                    : null

                  return (
                    <Card
                      key={item.businessId}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/business/${item.businessId}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium">{item.businessName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {sectorName || 'No sector'}
                            </p>
                          </div>
                          <Badge className={ragColors[item.ragStatus]}>
                            {item.latestScore}
                          </Badge>
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
        </Tabs>
      </div>
    </div>
  )
}
