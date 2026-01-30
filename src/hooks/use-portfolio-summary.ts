import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { calculateTrend, type TrendData } from '@/lib/scoring'

export interface PortfolioSummary {
  businessId: string
  businessName: string
  sectorId: string | null
  latestScore: number
  ragStatus: 'green' | 'amber' | 'red'
  month: string
  trend: TrendData | null
  isAnomaly: boolean // true if trend.change <= -10
}

interface BusinessRow {
  id: string
  name: string
  sector_id: string | null
}

interface ScorecardRow {
  business_id: string
  total_score: number
  rag_status: string
  month: string
}

/**
 * Hook for fetching portfolio summary with trend and anomaly detection
 *
 * Fetches all businesses with their latest 2 scorecards, computes trends,
 * and flags anomalies (businesses with >10 point score drops).
 *
 * Usage:
 * ```tsx
 * const { data: portfolio, isLoading } = usePortfolioSummary()
 * const anomalies = portfolio?.filter(p => p.isAnomaly)
 * ```
 */
export function usePortfolioSummary() {
  return useQuery({
    queryKey: ['portfolio', 'summary'],
    queryFn: async (): Promise<PortfolioSummary[]> => {
      // Fetch all businesses
      const { data: businesses, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, sector_id')
        .order('name')
      if (businessError) throw businessError

      // Fetch all scorecards ordered by month descending
      const { data: scorecards, error: scorecardError } = await supabase
        .from('scorecards')
        .select('business_id, total_score, rag_status, month')
        .order('month', { ascending: false })
      if (scorecardError) throw scorecardError

      // Group scorecards by business_id, keeping only latest 2 per business
      const scorecardsByBusiness = new Map<string, ScorecardRow[]>()
      for (const sc of scorecards as ScorecardRow[]) {
        const existing = scorecardsByBusiness.get(sc.business_id) || []
        if (existing.length < 2) {
          existing.push(sc)
          scorecardsByBusiness.set(sc.business_id, existing)
        }
      }

      // Build portfolio summary for each business
      const portfolio: PortfolioSummary[] = []
      for (const business of businesses as BusinessRow[]) {
        const businessScorecards = scorecardsByBusiness.get(business.id)
        if (!businessScorecards || businessScorecards.length === 0) {
          // Skip businesses with no scorecards
          continue
        }

        const latest = businessScorecards[0]
        const previous = businessScorecards.length > 1 ? businessScorecards[1] : null

        // Calculate trend
        const trend = calculateTrend(
          latest.total_score,
          previous ? previous.total_score : null
        )

        // Detect anomaly: score drop of 10 or more points
        const isAnomaly = trend !== null && trend.change <= -10

        portfolio.push({
          businessId: business.id,
          businessName: business.name,
          sectorId: business.sector_id,
          latestScore: latest.total_score,
          ragStatus: latest.rag_status as 'green' | 'amber' | 'red',
          month: latest.month,
          trend,
          isAnomaly,
        })
      }

      return portfolio
    },
  })
}
