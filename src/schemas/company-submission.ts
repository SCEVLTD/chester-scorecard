import { z } from 'zod'

// Optional positive monetary value (can be null/undefined when N/A)
const optionalPositiveMonetaryValue = z.coerce
  .number()
  .min(0, 'Must be a positive number')
  .optional()
  .nullable()

// Optional monetary value that can be negative (for net profit/loss)
const optionalMonetaryValue = z.coerce.number().optional().nullable()

export const companySubmissionSchema = z.object({
  // N/A flags - allows businesses to mark sections as not applicable
  revenueNa: z.boolean().optional().default(false),
  grossProfitNa: z.boolean().optional().default(false),
  overheadsNa: z.boolean().optional().default(false),
  wagesNa: z.boolean().optional().default(false),

  // Financial data (optional when corresponding N/A flag is true)
  revenueActual: optionalPositiveMonetaryValue,
  revenueTarget: optionalPositiveMonetaryValue,
  grossProfitActual: optionalMonetaryValue, // GP can be negative
  grossProfitTarget: optionalMonetaryValue,
  overheadsActual: optionalPositiveMonetaryValue,
  overheadsBudget: optionalPositiveMonetaryValue,
  netProfitActual: optionalMonetaryValue, // Will be auto-calculated (GP - Overheads)
  netProfitTarget: optionalMonetaryValue, // Will be auto-calculated (GP Target - Overheads Budget)
  netProfitOverride: z.boolean().optional(), // True if user manually set net profit
  totalWages: optionalPositiveMonetaryValue,
  productivityBenchmark: z.coerce
    .number()
    .min(0, 'Must be a positive number')
    .max(20, 'Typical range is 1.5-4.0')
    .optional()
    .nullable(),

  // Qualitative inputs from company (optional - helps consultant)
  companyBiggestOpportunity: z.string().trim().optional(),
  companyBiggestRisk: z.string().trim().optional(),
  companyChallenges: z.string().trim().optional(),
  companyWins: z.string().trim().optional(),

  // Submitter info
  submitterName: z.string().trim().optional(),
  submitterEmail: z.string().email('Invalid email').optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  // Validate that either N/A is checked OR values are provided for each section

  // Revenue validation
  if (!data.revenueNa) {
    if (data.revenueActual === null || data.revenueActual === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Revenue Actual is required (or mark as N/A)',
        path: ['revenueActual'],
      })
    }
    if (data.revenueTarget === null || data.revenueTarget === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Revenue Target is required (or mark as N/A)',
        path: ['revenueTarget'],
      })
    }
  }

  // Gross Profit validation
  if (!data.grossProfitNa) {
    if (data.grossProfitActual === null || data.grossProfitActual === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Gross Profit Actual is required (or mark as N/A)',
        path: ['grossProfitActual'],
      })
    }
    if (data.grossProfitTarget === null || data.grossProfitTarget === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Gross Profit Target is required (or mark as N/A)',
        path: ['grossProfitTarget'],
      })
    }
  }

  // Overheads validation
  if (!data.overheadsNa) {
    if (data.overheadsActual === null || data.overheadsActual === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Overheads Actual is required (or mark as N/A)',
        path: ['overheadsActual'],
      })
    }
    if (data.overheadsBudget === null || data.overheadsBudget === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Overheads Budget is required (or mark as N/A)',
        path: ['overheadsBudget'],
      })
    }
  }

  // Wages/Productivity validation
  if (!data.wagesNa) {
    if (data.totalWages === null || data.totalWages === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Total Wages is required (or mark as N/A)',
        path: ['totalWages'],
      })
    }
    if (data.productivityBenchmark === null || data.productivityBenchmark === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Productivity Benchmark is required (or mark as N/A)',
        path: ['productivityBenchmark'],
      })
    }
  }
})

export type CompanySubmissionData = z.infer<typeof companySubmissionSchema>
