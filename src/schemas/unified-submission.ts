import { z } from 'zod'

const positiveMonetaryValue = z.coerce
  .number()
  .min(0, 'Must be a positive number')

const monetaryValue = z.coerce.number()

// Qualitative option enums (match src/lib/scoring.ts)
// Leadership keeps N/A option for solo entrepreneurs (one-man bands)
// All other questions require a selection (N/A removed per client feedback)
const leadershipOptions = z.enum(['aligned', 'minor', 'misaligned', 'toxic', 'na'])
const marketDemandOptions = z.enum(['strong', 'flat', 'softening', 'decline'])
const marketingOptions = z.enum(['clear', 'activity', 'poor', 'none'])
const productOptions = z.enum(['differentiated', 'adequate', 'weak', 'broken'])
const supplierOptions = z.enum(['strong', 'acceptable', 'weak', 'damaging'])
const salesOptions = z.enum(['beating', 'onTarget', 'underperforming', 'none'])

export const unifiedSubmissionSchema = z.object({
  // Month selection (FORM-06)
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Select a month'),

  // Financial data (FORM-02)
  revenueActual: positiveMonetaryValue,
  revenueTarget: positiveMonetaryValue,
  grossProfitActual: monetaryValue,
  grossProfitTarget: monetaryValue,
  overheadsActual: positiveMonetaryValue,
  overheadsBudget: positiveMonetaryValue,
  netProfitActual: monetaryValue,
  netProfitTarget: monetaryValue,
  netProfitOverride: z.boolean().optional(),
  totalWages: positiveMonetaryValue,
  productivityBenchmark: z.coerce.number().min(0).max(20),

  // Lead KPIs (FORM-03) - optional
  outboundCalls: z.coerce.number().int().min(0).optional(),
  firstOrders: z.coerce.number().int().min(0).optional(),

  // Qualitative scoring (FORM-04) - required for unified form
  leadership: leadershipOptions,
  marketDemand: marketDemandOptions,
  marketing: marketingOptions,
  productStrength: productOptions,
  supplierStrength: supplierOptions,
  salesExecution: salesOptions,

  // Commentary (FORM-05) - optional
  companyWins: z.string().trim().optional(),
  companyChallenges: z.string().trim().optional(),
  companyBiggestOpportunity: z.string().trim().optional(),
  companyBiggestRisk: z.string().trim().optional(),
})

export type UnifiedSubmissionData = z.infer<typeof unifiedSubmissionSchema>
