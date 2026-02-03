import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { calculateTotalScore, getRagStatus } from '@/lib/scoring'
import type { CompanySubmission, CompanySubmissionInsert, DataRequest, ScorecardInsert } from '@/types/database.types'
import type { UnifiedSubmissionData } from '@/schemas/unified-submission'

/**
 * Calculate financial variance percentage
 * @param actual The actual value
 * @param target The target value
 * @returns Variance as percentage (-100 to +100)
 */
function calculateVariance(actual: number, target: number): number {
  if (target === 0) return 0
  return ((actual - target) / target) * 100
}

/**
 * Mutation hook to create or update a unified submission
 * Handles data_request creation and company_submissions upsert
 */
export function useCreateUnifiedSubmission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      businessId,
      data,
    }: {
      businessId: string
      data: UnifiedSubmissionData
    }) => {
      // 1. Find or create data_request for this business+month
      const { data: existingRequest, error: findError } = await supabase
        .from('data_requests')
        .select('id')
        .eq('business_id', businessId)
        .eq('month', data.month)
        .maybeSingle()

      if (findError) throw findError

      let dataRequestId: string

      if (existingRequest) {
        dataRequestId = existingRequest.id
      } else {
        // Create new data_request
        const { data: newRequest, error: createError } = await supabase
          .from('data_requests')
          .insert({
            business_id: businessId,
            month: data.month,
            token: crypto.randomUUID(), // Not used for auth flow but required by schema
            status: 'submitted',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          })
          .select()
          .single()

        if (createError) throw createError
        dataRequestId = (newRequest as DataRequest).id
      }

      // 2. Calculate variances for total score
      const revenueVariance = calculateVariance(data.revenueActual, data.revenueTarget)
      const grossProfitVariance = calculateVariance(data.grossProfitActual, data.grossProfitTarget)
      const overheadsVariance = calculateVariance(data.overheadsActual, data.overheadsBudget)
      const netProfitVariance = calculateVariance(data.netProfitActual, data.netProfitTarget)
      const productivityActual = data.totalWages > 0
        ? data.grossProfitActual / data.totalWages
        : 0

      // 3. Calculate score from all inputs (financial + qualitative)
      const score = calculateTotalScore({
        revenueVariance,
        grossProfitVariance,
        overheadsVariance,
        netProfitVariance,
        productivityBenchmark: data.productivityBenchmark,
        productivityActual,
        leadership: data.leadership,
        marketDemand: data.marketDemand,
        marketing: data.marketing,
        productStrength: data.productStrength,
        supplierStrength: data.supplierStrength,
        salesExecution: data.salesExecution,
      })

      // 4. Prepare upsert payload
      const submissionData: CompanySubmissionInsert = {
        data_request_id: dataRequestId,
        // Financial
        revenue_actual: data.revenueActual,
        revenue_target: data.revenueTarget,
        gross_profit_actual: data.grossProfitActual,
        gross_profit_target: data.grossProfitTarget,
        overheads_actual: data.overheadsActual,
        overheads_budget: data.overheadsBudget,
        net_profit_actual: data.netProfitActual,
        net_profit_target: data.netProfitTarget,
        net_profit_override: data.netProfitOverride || false,
        total_wages: data.totalWages,
        productivity_benchmark: data.productivityBenchmark,
        // Lead KPIs
        outbound_calls: data.outboundCalls ?? null,
        first_orders: data.firstOrders ?? null,
        // Qualitative
        leadership: data.leadership,
        market_demand: data.marketDemand,
        marketing: data.marketing,
        product_strength: data.productStrength,
        supplier_strength: data.supplierStrength,
        sales_execution: data.salesExecution,
        // Commentary
        company_wins: data.companyWins || null,
        company_challenges: data.companyChallenges || null,
        company_biggest_opportunity: data.companyBiggestOpportunity || null,
        company_biggest_risk: data.companyBiggestRisk || null,
      }

      // 5. Upsert submission
      const { data: result, error } = await supabase
        .from('company_submissions')
        .upsert(submissionData, { onConflict: 'data_request_id' })
        .select()
        .single()

      if (error) throw error

      // 6. Mark data_request as submitted
      await supabase
        .from('data_requests')
        .update({ status: 'submitted' })
        .eq('id', dataRequestId)

      // 7. Auto-create scorecard from submission data
      const scorecardPayload: ScorecardInsert = {
        business_id: businessId,
        month: data.month,
        consultant_name: null, // Self-assessment, no consultant
        // Financial variances (calculated above)
        revenue_variance: revenueVariance,
        gross_profit_variance: grossProfitVariance,
        overheads_variance: overheadsVariance,
        net_profit_variance: netProfitVariance,
        productivity_benchmark: data.productivityBenchmark,
        productivity_actual: productivityActual,
        // Qualitative from company submission
        leadership: data.leadership ?? null,
        market_demand: data.marketDemand ?? null,
        marketing: data.marketing ?? null,
        product_strength: data.productStrength ?? null,
        supplier_strength: data.supplierStrength ?? null,
        sales_execution: data.salesExecution ?? null,
        // No consultant commentary for self-assessment
        biggest_opportunity: null,
        biggest_risk: null,
        management_avoiding: null,
        leadership_confidence: null,
        consultant_gut_feel: null,
        // Computed
        total_score: score,
        rag_status: getRagStatus(score),
        company_submission_id: (result as CompanySubmission).id,
      }

      const { error: scorecardError } = await supabase
        .from('scorecards')
        .upsert(scorecardPayload, { onConflict: 'business_id,month' })

      if (scorecardError) {
        console.error('Failed to create scorecard:', scorecardError)
        // Don't throw - submission succeeded, scorecard is secondary
      }

      return { submission: result as CompanySubmission, score }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['unified-submission', variables.businessId] })
      queryClient.invalidateQueries({ queryKey: ['company-submission'] })
      // Invalidate scorecards so dashboard shows updated data
      queryClient.invalidateQueries({ queryKey: ['business-scorecards', variables.businessId] })
    },
  })
}

/**
 * Query hook to fetch existing submission for a business+month
 * Used to populate form when editing
 */
export function useUnifiedSubmission(businessId: string | undefined, month: string | undefined) {
  return useQuery({
    queryKey: ['unified-submission', businessId, month],
    queryFn: async () => {
      // First find the data request
      const { data: request, error: requestError } = await supabase
        .from('data_requests')
        .select('id')
        .eq('business_id', businessId!)
        .eq('month', month!)
        .maybeSingle()

      if (requestError) throw requestError
      if (!request) return null

      // Then get the submission
      const { data: submission, error: submissionError } = await supabase
        .from('company_submissions')
        .select('*')
        .eq('data_request_id', request.id)
        .maybeSingle()

      if (submissionError) throw submissionError
      return submission as CompanySubmission | null
    },
    enabled: !!businessId && !!month,
  })
}
