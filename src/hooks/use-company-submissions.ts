import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CompanySubmission, CompanySubmissionInsert } from '@/types/database.types'
import type { CompanySubmissionData } from '@/schemas/company-submission'

/**
 * Create or update a company submission
 */
export function useCreateCompanySubmission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      dataRequestId,
      data,
    }: {
      dataRequestId: string
      data: CompanySubmissionData
    }) => {
      const insert: CompanySubmissionInsert = {
        data_request_id: dataRequestId,
        // N/A flags
        revenue_na: data.revenueNa || false,
        gross_profit_na: data.grossProfitNa || false,
        overheads_na: data.overheadsNa || false,
        wages_na: data.wagesNa || false,
        // Financial data (null when N/A is true)
        revenue_actual: data.revenueNa ? null : data.revenueActual,
        revenue_target: data.revenueNa ? null : data.revenueTarget,
        gross_profit_actual: data.grossProfitNa ? null : data.grossProfitActual,
        gross_profit_target: data.grossProfitNa ? null : data.grossProfitTarget,
        overheads_actual: data.overheadsNa ? null : data.overheadsActual,
        overheads_budget: data.overheadsNa ? null : data.overheadsBudget,
        net_profit_actual: (data.grossProfitNa || data.overheadsNa) ? null : data.netProfitActual,
        net_profit_target: (data.grossProfitNa || data.overheadsNa) ? null : data.netProfitTarget,
        net_profit_override: data.netProfitOverride || false,
        total_wages: data.wagesNa ? null : data.totalWages,
        productivity_benchmark: data.wagesNa ? null : data.productivityBenchmark,
        // Qualitative inputs
        company_biggest_opportunity: data.companyBiggestOpportunity || null,
        company_biggest_risk: data.companyBiggestRisk || null,
        company_challenges: data.companyChallenges || null,
        company_wins: data.companyWins || null,
        // Metadata
        submitted_by_name: data.submitterName || null,
        submitted_by_email: data.submitterEmail || null,
      }

      // Use upsert to allow updates
      const { data: result, error } = await supabase
        .from('company_submissions')
        .upsert(insert, { onConflict: 'data_request_id' })
        .select()
        .single()

      if (error) throw error

      // Update data request status to 'submitted'
      await supabase
        .from('data_requests')
        .update({ status: 'submitted' })
        .eq('id', dataRequestId)

      return result as CompanySubmission
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['company-submission', variables.dataRequestId] })
      queryClient.invalidateQueries({ queryKey: ['data-request'] })
    },
  })
}

/**
 * Get submission for a data request
 */
export function useSubmissionForRequest(dataRequestId: string | undefined) {
  return useQuery({
    queryKey: ['company-submission', dataRequestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_submissions')
        .select('*')
        .eq('data_request_id', dataRequestId!)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
      return data as CompanySubmission | null
    },
    enabled: !!dataRequestId,
  })
}

/**
 * Get submission by data request token
 * Used on public submission page to show existing data
 */
export function useSubmissionByToken(token: string) {
  return useQuery({
    queryKey: ['company-submission', 'token', token],
    queryFn: async () => {
      // First get the data request ID from the token
      const { data: request, error: requestError } = await supabase
        .from('data_requests')
        .select('id')
        .eq('token', token)
        .single()

      if (requestError) throw requestError
      if (!request) return null

      // Then get the submission
      const { data: submission, error: submissionError } = await supabase
        .from('company_submissions')
        .select('*')
        .eq('data_request_id', request.id)
        .single()

      if (submissionError && submissionError.code !== 'PGRST116') throw submissionError
      return submission as CompanySubmission | null
    },
    enabled: !!token,
  })
}

/**
 * Get submission for a business+month combination
 * Used when consultant creates scorecard to check for pending submission
 */
export function useSubmissionForBusinessMonth(businessId: string | undefined, month: string | undefined) {
  return useQuery({
    queryKey: ['company-submission', 'business-month', businessId, month],
    queryFn: async () => {
      // First find the data request for this business+month
      const { data: request, error: requestError } = await supabase
        .from('data_requests')
        .select('id, status')
        .eq('business_id', businessId!)
        .eq('month', month!)
        .single()

      if (requestError && requestError.code !== 'PGRST116') throw requestError
      if (!request || request.status !== 'submitted') return null

      // Then get the submission
      const { data: submission, error: submissionError } = await supabase
        .from('company_submissions')
        .select('*')
        .eq('data_request_id', request.id)
        .single()

      if (submissionError && submissionError.code !== 'PGRST116') throw submissionError
      return submission as CompanySubmission | null
    },
    enabled: !!businessId && !!month,
  })
}
