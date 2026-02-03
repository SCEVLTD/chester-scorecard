import type { Scorecard } from '@/types/database.types'
import type { ScorecardData } from '@/schemas/scorecard'
import {
  validateLeadership,
  validateMarketDemand,
  validateMarketing,
  validateProductStrength,
  validateSupplierStrength,
  validateSalesExecution,
  validateLeadershipConfidence,
} from './validation-helpers'

/**
 * Map database Scorecard (snake_case) to form data (camelCase)
 *
 * Used when loading an existing scorecard for editing.
 * Handles null-to-undefined conversion for optional fields.
 *
 * Uses validation helpers to safely coerce enum values from the database.
 * Invalid values are logged and converted to undefined, causing the form
 * to show "Select..." placeholder for that field.
 */
export function mapScorecardToForm(scorecard: Scorecard): ScorecardData {
  return {
    month: scorecard.month,
    consultantName: scorecard.consultant_name || '',
    // Financial (null -> undefined)
    revenueVariance: scorecard.revenue_variance ?? undefined,
    grossProfitVariance: scorecard.gross_profit_variance ?? undefined,
    overheadsVariance: scorecard.overheads_variance ?? undefined,
    netProfitVariance: scorecard.net_profit_variance ?? undefined,
    // People/HR - validated enums
    productivityBenchmark: scorecard.productivity_benchmark ?? undefined,
    productivityActual: scorecard.productivity_actual ?? undefined,
    leadership: validateLeadership(scorecard.leadership),
    // Market - validated enums
    marketDemand: validateMarketDemand(scorecard.market_demand),
    marketing: validateMarketing(scorecard.marketing),
    // Product - validated enum
    productStrength: validateProductStrength(scorecard.product_strength),
    // Suppliers - validated enum
    supplierStrength: validateSupplierStrength(scorecard.supplier_strength),
    // Sales - validated enum
    salesExecution: validateSalesExecution(scorecard.sales_execution),
    // Commentary (nullable fields, provide defaults)
    biggestOpportunity: scorecard.biggest_opportunity || '',
    biggestRisk: scorecard.biggest_risk || '',
    managementAvoiding: scorecard.management_avoiding || '',
    leadershipConfidence: validateLeadershipConfidence(scorecard.leadership_confidence) || 'yes',
    consultantGutFeel: scorecard.consultant_gut_feel || '',
  }
}
