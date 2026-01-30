import { z } from 'zod'

const positiveMonetaryValue = z.coerce
  .number()
  .min(0, 'Must be a positive number')

// Net profit can be negative (loss)
const monetaryValue = z.coerce.number()

export const companySubmissionSchema = z.object({
  // Financial data
  revenueActual: positiveMonetaryValue,
  revenueTarget: positiveMonetaryValue,
  grossProfitActual: monetaryValue, // GP can be negative
  grossProfitTarget: monetaryValue,
  overheadsActual: positiveMonetaryValue,
  overheadsBudget: positiveMonetaryValue,
  netProfitActual: monetaryValue, // Will be auto-calculated (GP - Overheads)
  netProfitTarget: monetaryValue, // Will be auto-calculated (GP Target - Overheads Budget)
  netProfitOverride: z.boolean().optional(), // True if user manually set net profit
  totalWages: positiveMonetaryValue,
  productivityBenchmark: z.coerce
    .number()
    .min(0, 'Must be a positive number')
    .max(20, 'Typical range is 1.5-4.0'),

  // Qualitative inputs from company (optional - helps consultant)
  companyBiggestOpportunity: z.string().trim().optional(),
  companyBiggestRisk: z.string().trim().optional(),
  companyChallenges: z.string().trim().optional(),
  companyWins: z.string().trim().optional(),

  // Submitter info
  submitterName: z.string().trim().optional(),
  submitterEmail: z.string().email('Invalid email').optional().or(z.literal('')),
})

export type CompanySubmissionData = z.infer<typeof companySubmissionSchema>
