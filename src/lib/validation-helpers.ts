import { z } from 'zod'

/**
 * Validation helpers for safe type coercion from database values
 *
 * These functions use Zod safeParse to validate enum values from the database.
 * Instead of throwing errors, they return undefined for invalid values and log warnings.
 * This prevents crashes when database contains unexpected values while preserving
 * type safety in the application.
 */

// Define the enum schemas (matching those in scorecard.ts)
// Leadership keeps 'na' option for solo entrepreneurs (one-man bands)
const leadershipSchema = z.enum(['aligned', 'minor', 'misaligned', 'toxic', 'na'])
const marketDemandSchema = z.enum(['strong', 'flat', 'softening', 'decline'])
const marketingSchema = z.enum(['clear', 'activity', 'poor', 'none'])
const productSchema = z.enum(['differentiated', 'adequate', 'weak', 'broken'])
const supplierSchema = z.enum(['strong', 'acceptable', 'weak', 'damaging'])
const salesSchema = z.enum(['beating', 'onTarget', 'underperforming', 'none'])
const leadershipConfidenceSchema = z.enum(['yes', 'maybe', 'no'])

// Type aliases for the enum values
type LeadershipValue = z.infer<typeof leadershipSchema>
type MarketDemandValue = z.infer<typeof marketDemandSchema>
type MarketingValue = z.infer<typeof marketingSchema>
type ProductValue = z.infer<typeof productSchema>
type SupplierValue = z.infer<typeof supplierSchema>
type SalesValue = z.infer<typeof salesSchema>
type LeadershipConfidenceValue = z.infer<typeof leadershipConfidenceSchema>

// Export pre-configured validators for each field
export function validateLeadership(value: string | null): LeadershipValue | undefined {
  if (value === null || value === undefined) return undefined
  const result = leadershipSchema.safeParse(value)
  if (result.success) return result.data
  console.warn(`[scorecard-mapper] Invalid leadership value "${value}". Using undefined.`)
  return undefined
}

export function validateMarketDemand(value: string | null): MarketDemandValue | undefined {
  if (value === null || value === undefined) return undefined
  const result = marketDemandSchema.safeParse(value)
  if (result.success) return result.data
  console.warn(`[scorecard-mapper] Invalid marketDemand value "${value}". Using undefined.`)
  return undefined
}

export function validateMarketing(value: string | null): MarketingValue | undefined {
  if (value === null || value === undefined) return undefined
  const result = marketingSchema.safeParse(value)
  if (result.success) return result.data
  console.warn(`[scorecard-mapper] Invalid marketing value "${value}". Using undefined.`)
  return undefined
}

export function validateProductStrength(value: string | null): ProductValue | undefined {
  if (value === null || value === undefined) return undefined
  const result = productSchema.safeParse(value)
  if (result.success) return result.data
  console.warn(`[scorecard-mapper] Invalid productStrength value "${value}". Using undefined.`)
  return undefined
}

export function validateSupplierStrength(value: string | null): SupplierValue | undefined {
  if (value === null || value === undefined) return undefined
  const result = supplierSchema.safeParse(value)
  if (result.success) return result.data
  console.warn(`[scorecard-mapper] Invalid supplierStrength value "${value}". Using undefined.`)
  return undefined
}

export function validateSalesExecution(value: string | null): SalesValue | undefined {
  if (value === null || value === undefined) return undefined
  const result = salesSchema.safeParse(value)
  if (result.success) return result.data
  console.warn(`[scorecard-mapper] Invalid salesExecution value "${value}". Using undefined.`)
  return undefined
}

export function validateLeadershipConfidence(value: string | null): LeadershipConfidenceValue | undefined {
  if (value === null || value === undefined) return undefined
  const result = leadershipConfidenceSchema.safeParse(value)
  if (result.success) return result.data
  console.warn(`[scorecard-mapper] Invalid leadershipConfidence value "${value}". Using undefined.`)
  return undefined
}
