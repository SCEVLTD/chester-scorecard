import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ValidatedImportRow } from '@/schemas/import-row'
import type { DataRequestInsert, CompanySubmissionInsert } from '@/types/database.types'

interface ImportProgress {
  total: number
  completed: number
  failed: number
  isComplete: boolean
  errors: string[]
}

interface ImportResult {
  successCount: number
  failureCount: number
  errors: string[]
}

/**
 * Hook to import validated rows into database
 * Creates data_requests and company_submissions for each row
 */
export function useExcelImport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      rows,
      onProgress,
    }: {
      rows: ValidatedImportRow[]
      onProgress?: (progress: ImportProgress) => void
    }): Promise<ImportResult> => {
      const errors: string[] = []
      let completed = 0
      let failed = 0

      for (const row of rows) {
        try {
          // 1. Find or create data_request for business+month
          const { data: existingRequest, error: findError } = await supabase
            .from('data_requests')
            .select('id')
            .eq('business_id', row.businessId)
            .eq('month', row.month)
            .maybeSingle()

          if (findError) throw findError

          let dataRequestId: string

          if (existingRequest) {
            dataRequestId = existingRequest.id
          } else {
            // Create new data_request
            const newRequest: DataRequestInsert = {
              business_id: row.businessId,
              month: row.month,
              token: crypto.randomUUID(),
              status: 'submitted',
              expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
            }

            const { data: created, error: createError } = await supabase
              .from('data_requests')
              .insert(newRequest)
              .select('id')
              .single()

            if (createError) throw createError
            dataRequestId = created.id
          }

          // 2. Build company_submission data
          // For historical import, we only have what's in the Excel
          // Calculate EBITDA if not provided but GP and overheads exist
          const netProfit = row.ebitda ??
            (row.grossProfit !== undefined && row.overheads !== undefined
              ? row.grossProfit - row.overheads
              : 0)
          const netProfitTarget = row.ebitdaTarget ??
            (row.grossProfitTarget !== undefined && row.overheadsTarget !== undefined
              ? row.grossProfitTarget - row.overheadsTarget
              : 0)

          const submission: CompanySubmissionInsert = {
            data_request_id: dataRequestId,
            // Financial actuals
            revenue_actual: row.revenue ?? 0,
            revenue_target: row.revenueTarget ?? 0,
            gross_profit_actual: row.grossProfit ?? 0,
            gross_profit_target: row.grossProfitTarget ?? 0,
            overheads_actual: row.overheads ?? 0,
            overheads_budget: row.overheadsTarget ?? 0,
            net_profit_actual: netProfit,
            net_profit_target: netProfitTarget,
            net_profit_override: row.ebitda !== undefined, // True if EBITDA was explicit
            total_wages: row.totalWages ?? 0,
            productivity_benchmark: 2.5, // Default - can be adjusted later
            // Lead KPIs
            outbound_calls: row.outboundCalls ?? null,
            first_orders: row.firstOrders ?? null,
            // Qualitative - null for historical (no self-assessment)
            leadership: null,
            market_demand: null,
            marketing: null,
            product_strength: null,
            supplier_strength: null,
            sales_execution: null,
            // Commentary
            company_wins: null,
            company_challenges: null,
            company_biggest_opportunity: null,
            company_biggest_risk: null,
            // Metadata
            submitted_by_name: 'Historical Import',
          }

          // 3. Upsert company_submission
          const { error: upsertError } = await supabase
            .from('company_submissions')
            .upsert(submission, { onConflict: 'data_request_id' })

          if (upsertError) throw upsertError

          completed++
        } catch (err) {
          failed++
          const errMsg = err instanceof Error ? err.message : 'Unknown error'
          errors.push(`Row ${row.month} for ${row.businessName}: ${errMsg}`)
        }

        // Report progress
        onProgress?.({
          total: rows.length,
          completed,
          failed,
          isComplete: false,
          errors,
        })
      }

      // Final progress
      onProgress?.({
        total: rows.length,
        completed,
        failed,
        isComplete: true,
        errors,
      })

      return {
        successCount: completed,
        failureCount: failed,
        errors,
      }
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['company-submissions'] })
      queryClient.invalidateQueries({ queryKey: ['data-requests'] })
      queryClient.invalidateQueries({ queryKey: ['scorecards'] })
    },
  })
}
