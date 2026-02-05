import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CompanyMonthlyPerformance, EProfile } from '@/types/database.types'

// CompanyPerformanceRow interface - used internally for Supabase query result typing

/**
 * Hook for fetching a company's historical performance data
 *
 * Returns monthly revenue and EBITDA actuals vs targets.
 * RLS ensures users can only see their own company's data.
 *
 * Usage:
 * ```tsx
 * const { data, isLoading } = useCompanyPerformance(businessId)
 * ```
 */
export function useCompanyPerformance(
  businessId: string | undefined,
  options?: { fromMonth?: string; toMonth?: string }
) {
  return useQuery({
    queryKey: ['company-performance', businessId, options?.fromMonth, options?.toMonth],
    queryFn: async (): Promise<CompanyMonthlyPerformance[]> => {
      // Query company_submissions joined with data_requests and businesses
      let query = supabase
        .from('company_submissions')
        .select(`
          data_request_id,
          revenue_actual,
          revenue_target,
          net_profit_actual,
          net_profit_target,
          data_requests!inner(
            month,
            business_id,
            businesses!inner(
              name,
              e_profile
            )
          )
        `)
        .eq('data_requests.business_id', businessId!)
        .order('data_requests(month)', { ascending: true })

      const { data, error } = await query
      if (error) throw error

      // Transform the nested data into flat performance records
      const performanceData: CompanyMonthlyPerformance[] = (data || []).map((row) => {
        const dataRequest = row.data_requests as unknown as {
          month: string
          business_id: string
          businesses: { name: string; e_profile: EProfile | null }
        }
        return {
          month: dataRequest.month,
          business_id: dataRequest.business_id,
          business_name: dataRequest.businesses.name,
          e_profile: dataRequest.businesses.e_profile,
          revenue_actual: row.revenue_actual,
          revenue_target: row.revenue_target,
          // net_profit is used for EBITDA in this schema
          ebitda_actual: row.net_profit_actual,
          ebitda_target: row.net_profit_target,
        }
      })

      // Apply date filters if specified
      let filteredData = performanceData
      if (options?.fromMonth) {
        filteredData = filteredData.filter((d) => d.month >= options.fromMonth!)
      }
      if (options?.toMonth) {
        filteredData = filteredData.filter((d) => d.month <= options.toMonth!)
      }

      return filteredData
    },
    enabled: !!businessId,
  })
}

/**
 * Hook for fetching company YTD summary
 *
 * Returns year-to-date totals for a specific business and year.
 *
 * Usage:
 * ```tsx
 * const { data } = useCompanyYtdSummary(businessId, 2025)
 * ```
 */
export function useCompanyYtdSummary(businessId: string | undefined, year: number) {
  return useQuery({
    queryKey: ['company-ytd', businessId, year],
    queryFn: async () => {
      const fromMonth = `${year}-01`
      const toMonth = `${year}-12`

      const { data, error } = await supabase
        .from('company_submissions')
        .select(`
          revenue_actual,
          revenue_target,
          net_profit_actual,
          net_profit_target,
          data_requests!inner(month, business_id)
        `)
        .eq('data_requests.business_id', businessId!)
        .gte('data_requests.month', fromMonth)
        .lte('data_requests.month', toMonth)

      if (error) throw error

      // Calculate YTD totals
      const ytd = (data || []).reduce(
        (acc, row) => ({
          revenue_actual: acc.revenue_actual + (row.revenue_actual || 0),
          revenue_target: acc.revenue_target + (row.revenue_target || 0),
          ebitda_actual: acc.ebitda_actual + (row.net_profit_actual || 0),
          ebitda_target: acc.ebitda_target + (row.net_profit_target || 0),
          months_count: acc.months_count + 1,
        }),
        {
          revenue_actual: 0,
          revenue_target: 0,
          ebitda_actual: 0,
          ebitda_target: 0,
          months_count: 0,
        }
      )

      return {
        ...ytd,
        revenue_variance_pct:
          ytd.revenue_target > 0
            ? ((ytd.revenue_actual - ytd.revenue_target) / ytd.revenue_target) * 100
            : null,
        ebitda_variance_pct:
          ytd.ebitda_target > 0
            ? ((ytd.ebitda_actual - ytd.ebitda_target) / ytd.ebitda_target) * 100
            : null,
        ebitda_pct:
          ytd.revenue_actual > 0 ? (ytd.ebitda_actual / ytd.revenue_actual) * 100 : null,
      }
    },
    enabled: !!businessId,
  })
}

/**
 * Hook for fetching targets for a specific month (for auto-fill)
 *
 * Returns the target values for a business in a specific month.
 * Used to pre-populate submission forms.
 *
 * Usage:
 * ```tsx
 * const { data } = useMonthlyTargets(businessId, '2026-01')
 * ```
 */
export function useMonthlyTargets(businessId: string | undefined, month: string | undefined) {
  return useQuery({
    queryKey: ['monthly-targets', businessId, month],
    queryFn: async () => {
      // Look for existing data request/submission with targets for this month
      const { data, error } = await supabase
        .from('company_submissions')
        .select(`
          revenue_target,
          net_profit_target,
          data_requests!inner(month, business_id)
        `)
        .eq('data_requests.business_id', businessId!)
        .eq('data_requests.month', month!)
        .maybeSingle()

      if (error) throw error

      if (data) {
        return {
          revenue_target: data.revenue_target,
          ebitda_target: data.net_profit_target,
        }
      }

      // If no existing data, check if there are targets from nearby months
      // to suggest reasonable defaults (optional enhancement)
      return null
    },
    enabled: !!businessId && !!month,
  })
}
