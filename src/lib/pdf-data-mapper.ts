/**
 * PDF Data Mapper for UBT Monthly Business Scorecard
 *
 * Transforms Scorecard database records into a PDF-friendly format
 * with pre-calculated scores for display.
 */
import { format } from 'date-fns'
import type { Scorecard } from '@/types/database.types'
import type { AIAnalysis } from '@/types/ai-analysis.types'
import {
  scoreFinancialMetric,
  scoreOverheads,
  calculateProductivityVariance,
  scoreProductivity,
  LEADERSHIP_SCORES,
  MARKET_DEMAND_SCORES,
  MARKETING_SCORES,
  PRODUCT_SCORES,
  SUPPLIER_SCORES,
  SALES_SCORES,
} from '@/lib/scoring'

/**
 * PDF-friendly scorecard data structure with pre-calculated scores
 */
export interface PdfScorecardData {
  businessName: string
  month: string // Formatted: "January 2026"
  consultantName: string
  totalScore: number
  ragStatus: 'green' | 'amber' | 'red'
  submittedAt: string // Formatted date

  financial: {
    revenue: { variance: number | null; score: number }
    grossProfit: { variance: number | null; score: number }
    overheads: { variance: number | null; score: number }
    netProfit: { variance: number | null; score: number }
    subtotal: number
  }

  people: {
    productivity: {
      benchmark: number | null
      actual: number | null
      variance: number
      score: number
    }
    leadership: { choice: string | null; score: number }
    subtotal: number
  }

  market: {
    demand: { choice: string | null; score: number }
    marketing: { choice: string | null; score: number }
    subtotal: number
  }

  product: { choice: string | null; score: number }
  suppliers: { choice: string | null; score: number }
  sales: { choice: string | null; score: number }

  commentary: {
    biggestOpportunity: string
    biggestRisk: string
    managementAvoiding: string
    leadershipConfidence: string
    gutFeel: string
  }

  aiAnalysis?: AIAnalysis
}

/**
 * Get human-readable label for qualitative choices
 */
function getChoiceLabel(choice: string | null): string {
  if (!choice) return 'Not specified'

  // Convert camelCase to Title Case with spaces
  const labels: Record<string, string> = {
    // Leadership
    aligned: 'Fully aligned',
    minor: 'Minor issues',
    misaligned: 'Misaligned',
    toxic: 'Toxic',
    // Market demand
    strong: 'Strong demand',
    flat: 'Flat',
    softening: 'Softening',
    decline: 'Decline',
    // Marketing
    clear: 'Clear strategy',
    activity: 'Activity present',
    poor: 'Poor execution',
    none: 'None',
    // Product
    differentiated: 'Differentiated',
    adequate: 'Adequate',
    weak: 'Weak',
    broken: 'Broken',
    // Suppliers
    acceptable: 'Acceptable',
    damaging: 'Damaging',
    // Sales
    beating: 'Beating targets',
    onTarget: 'On target',
    underperforming: 'Underperforming',
  }

  return labels[choice] || choice
}

/**
 * Transform a Scorecard record into PDF-friendly display format
 *
 * @param scorecard The scorecard database record
 * @param businessName The business name for the header
 * @returns PDF-ready data structure with calculated scores
 */
export function mapScorecardToPdfData(
  scorecard: Scorecard,
  businessName: string
): PdfScorecardData {
  // Calculate individual financial scores
  const revenueScore = scorecard.revenue_variance !== null
    ? scoreFinancialMetric(scorecard.revenue_variance)
    : 0
  const gpScore = scorecard.gross_profit_variance !== null
    ? scoreFinancialMetric(scorecard.gross_profit_variance)
    : 0
  const overheadsScore = scorecard.overheads_variance !== null
    ? scoreOverheads(scorecard.overheads_variance)
    : 0
  const netProfitScore = scorecard.net_profit_variance !== null
    ? scoreFinancialMetric(scorecard.net_profit_variance)
    : 0
  const financialSubtotal = revenueScore + gpScore + overheadsScore + netProfitScore

  // Calculate productivity
  const productivityVariance = calculateProductivityVariance(
    scorecard.productivity_benchmark ?? 0,
    scorecard.productivity_actual ?? 0
  )
  const productivityScore = scoreProductivity(productivityVariance)
  const leadershipScore = LEADERSHIP_SCORES[scorecard.leadership ?? ''] ?? 0
  const peopleSubtotal = productivityScore + leadershipScore

  // Calculate market scores
  const demandScore = MARKET_DEMAND_SCORES[scorecard.market_demand ?? ''] ?? 0
  const marketingScore = MARKETING_SCORES[scorecard.marketing ?? ''] ?? 0
  const marketSubtotal = demandScore + marketingScore

  // Calculate other qualitative scores
  const productScore = PRODUCT_SCORES[scorecard.product_strength ?? ''] ?? 0
  const supplierScore = SUPPLIER_SCORES[scorecard.supplier_strength ?? ''] ?? 0
  const salesScore = SALES_SCORES[scorecard.sales_execution ?? ''] ?? 0

  // Parse AI analysis if present
  const aiAnalysis = scorecard.ai_analysis
    ? (scorecard.ai_analysis as unknown as AIAnalysis)
    : undefined

  return {
    businessName,
    month: format(new Date(scorecard.month + '-01'), 'MMMM yyyy'),
    consultantName: scorecard.consultant_name,
    totalScore: scorecard.total_score,
    ragStatus: scorecard.rag_status as 'green' | 'amber' | 'red',
    submittedAt: format(new Date(scorecard.created_at), 'dd MMM yyyy, HH:mm'),

    financial: {
      revenue: { variance: scorecard.revenue_variance, score: revenueScore },
      grossProfit: { variance: scorecard.gross_profit_variance, score: gpScore },
      overheads: { variance: scorecard.overheads_variance, score: overheadsScore },
      netProfit: { variance: scorecard.net_profit_variance, score: netProfitScore },
      subtotal: financialSubtotal,
    },

    people: {
      productivity: {
        benchmark: scorecard.productivity_benchmark,
        actual: scorecard.productivity_actual,
        variance: productivityVariance,
        score: productivityScore,
      },
      leadership: {
        choice: getChoiceLabel(scorecard.leadership),
        score: leadershipScore,
      },
      subtotal: peopleSubtotal,
    },

    market: {
      demand: {
        choice: getChoiceLabel(scorecard.market_demand),
        score: demandScore,
      },
      marketing: {
        choice: getChoiceLabel(scorecard.marketing),
        score: marketingScore,
      },
      subtotal: marketSubtotal,
    },

    product: {
      choice: getChoiceLabel(scorecard.product_strength),
      score: productScore,
    },
    suppliers: {
      choice: getChoiceLabel(scorecard.supplier_strength),
      score: supplierScore,
    },
    sales: {
      choice: getChoiceLabel(scorecard.sales_execution),
      score: salesScore,
    },

    commentary: {
      biggestOpportunity: scorecard.biggest_opportunity,
      biggestRisk: scorecard.biggest_risk,
      managementAvoiding: scorecard.management_avoiding,
      leadershipConfidence: scorecard.leadership_confidence,
      gutFeel: scorecard.consultant_gut_feel,
    },

    aiAnalysis,
  }
}
