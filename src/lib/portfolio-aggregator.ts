/**
 * Portfolio Aggregator for AI Analysis
 *
 * Transforms raw portfolio data into a compact summary for LLM analysis.
 * Pre-aggregation reduces tokens by 90%+ (3KB vs 40KB raw).
 *
 * The aggregation includes:
 * - RAG distribution counts
 * - Score statistics (average, range)
 * - Section-level weakness analysis
 * - Anomaly detection (pre-flagged)
 * - Per-business summaries with key metrics
 */

import { calculateSectionScores, SECTION_CONFIG } from '@/lib/chart-utils'
import type { PortfolioSummary } from '@/hooks/use-portfolio-summary'
import type { Scorecard } from '@/types/database.types'

/**
 * Aggregated portfolio data for AI analysis.
 * Designed to be compact (~3KB) while providing all necessary context.
 */
export interface PortfolioAggregate {
  /** Total number of businesses in portfolio */
  totalBusinesses: number
  /** Most recent month in the data (YYYY-MM format) */
  analysisMonth: string
  /** Count of businesses by RAG status */
  distribution: {
    green: number
    amber: number
    red: number
  }
  /** Average total score across all businesses */
  averageScore: number
  /** Min and max scores in portfolio */
  scoreRange: {
    min: number
    max: number
  }
  /** Sections ranked by weakness (lowest percentOfMax first) */
  weakestSections: {
    section: string
    avgScore: number
    percentOfMax: number
    businessesBelow50Pct: number
  }[]
  /** Businesses with significant score drops (>= 10 points) */
  anomalies: {
    businessName: string
    scoreChange: number
    currentScore: number
    ragStatus: string
  }[]
  /** Condensed summary for each business */
  businesses: {
    name: string
    score: number
    rag: string
    trend: 'up' | 'down' | 'same' | null
    trendChange: number | null
    topRisk: string
    topOpportunity: string
    weakestSection: string
  }[]
}

/**
 * Aggregate portfolio data for AI analysis.
 *
 * Takes the portfolio summary (from usePortfolioSummary) and full scorecards,
 * and produces a compact aggregate suitable for LLM prompts.
 *
 * @param portfolioSummary - Summary data from usePortfolioSummary hook
 * @param scorecards - Map of businessId to full Scorecard object
 * @returns Aggregated portfolio data (~3KB)
 *
 * @example
 * ```ts
 * const aggregate = aggregatePortfolio(portfolioSummary, scorecards)
 * // aggregate.totalBusinesses -> 15
 * // aggregate.averageScore -> 72
 * // aggregate.weakestSections[0].section -> 'Marketing'
 * ```
 */
export function aggregatePortfolio(
  portfolioSummary: PortfolioSummary[],
  scorecards: Map<string, Scorecard>
): PortfolioAggregate {
  // Handle empty portfolio
  if (portfolioSummary.length === 0) {
    return {
      totalBusinesses: 0,
      analysisMonth: new Date().toISOString().slice(0, 7),
      distribution: { green: 0, amber: 0, red: 0 },
      averageScore: 0,
      scoreRange: { min: 0, max: 0 },
      weakestSections: [],
      anomalies: [],
      businesses: [],
    }
  }

  // Calculate RAG distribution
  const distribution = { green: 0, amber: 0, red: 0 }
  portfolioSummary.forEach(p => distribution[p.ragStatus]++)

  // Calculate score statistics
  const scores = portfolioSummary.map(p => p.latestScore)
  const averageScore = Math.round(
    scores.reduce((sum, score) => sum + score, 0) / scores.length
  )

  // Initialize section score accumulators
  const sectionScores: Record<string, number[]> = {
    financial: [],
    people: [],
    market: [],
    product: [],
    suppliers: [],
    sales: [],
  }

  // Build per-business summaries and accumulate section scores
  const businessSummaries: PortfolioAggregate['businesses'] = []

  for (const summary of portfolioSummary) {
    const scorecard = scorecards.get(summary.businessId)
    if (!scorecard) continue

    // Calculate section scores for this business
    const sections = calculateSectionScores(scorecard)

    // Accumulate section scores for portfolio-wide analysis
    Object.entries(sections).forEach(([key, value]) => {
      sectionScores[key].push(value)
    })

    // Find weakest section for this business (lowest percentage of max)
    let weakestSection = 'Financial'
    let lowestPct = 100

    Object.entries(sections).forEach(([key, value]) => {
      const config = SECTION_CONFIG[key as keyof typeof SECTION_CONFIG]
      const pct = (value / config.maxScore) * 100
      if (pct < lowestPct) {
        lowestPct = pct
        weakestSection = config.label
      }
    })

    businessSummaries.push({
      name: summary.businessName,
      score: summary.latestScore,
      rag: summary.ragStatus,
      trend: summary.trend?.direction || null,
      trendChange: summary.trend?.change || null,
      topRisk: scorecard.biggest_risk || 'Not specified',
      topOpportunity: scorecard.biggest_opportunity || 'Not specified',
      weakestSection,
    })
  }

  // Calculate weakest sections portfolio-wide
  const weakestSections = Object.entries(sectionScores)
    .filter(([, values]) => values.length > 0)
    .map(([key, values]) => {
      const config = SECTION_CONFIG[key as keyof typeof SECTION_CONFIG]
      const avgScore = values.reduce((sum, v) => sum + v, 0) / values.length
      const percentOfMax = (avgScore / config.maxScore) * 100
      const businessesBelow50Pct = values.filter(
        v => (v / config.maxScore) < 0.5
      ).length

      return {
        section: config.label,
        avgScore,
        percentOfMax,
        businessesBelow50Pct,
      }
    })
    .sort((a, b) => a.percentOfMax - b.percentOfMax)

  // Extract anomalies (businesses with >= 10 point drops)
  const anomalies = portfolioSummary
    .filter(p => p.isAnomaly)
    .map(p => ({
      businessName: p.businessName,
      scoreChange: p.trend?.change || 0,
      currentScore: p.latestScore,
      ragStatus: p.ragStatus,
    }))

  // Determine analysis month (most recent month in data)
  const months = portfolioSummary.map(p => p.month).filter(Boolean)
  const sortedMonths = [...new Set(months)].sort().reverse()
  const analysisMonth = sortedMonths[0] || new Date().toISOString().slice(0, 7)

  return {
    totalBusinesses: portfolioSummary.length,
    analysisMonth,
    distribution,
    averageScore,
    scoreRange: {
      min: Math.min(...scores),
      max: Math.max(...scores),
    },
    weakestSections,
    anomalies,
    businesses: businessSummaries,
  }
}
