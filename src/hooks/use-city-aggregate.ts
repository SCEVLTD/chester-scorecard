import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  CityMonthlyAggregate,
  CityYtdAggregate,
  EProfileMonthlyAggregate,
} from '@/types/database.types'

/**
 * Hook for fetching city-wide monthly aggregate data
 *
 * Returns aggregated revenue and EBITDA data across all Chester businesses.
 * Fully anonymised - no individual company data exposed.
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, error } = useCityMonthlyAggregate(2025)
 * ```
 */
export function useCityMonthlyAggregate(year?: number) {
  return useQuery({
    queryKey: ['city-aggregate', 'monthly', year],
    queryFn: async (): Promise<CityMonthlyAggregate[]> => {
      let query = supabase
        .from('city_monthly_aggregate')
        .select('*')
        .order('month', { ascending: true })

      // Filter by year if specified
      if (year) {
        query = query
          .gte('month', `${year}-01`)
          .lte('month', `${year}-12`)
      }

      const { data, error } = await query
      if (error) throw error
      return data as CityMonthlyAggregate[]
    },
  })
}

/**
 * Hook for fetching city-wide YTD aggregate data
 *
 * Returns year-to-date totals for all years with data.
 *
 * Usage:
 * ```tsx
 * const { data, isLoading } = useCityYtdAggregate()
 * ```
 */
export function useCityYtdAggregate() {
  return useQuery({
    queryKey: ['city-aggregate', 'ytd'],
    queryFn: async (): Promise<CityYtdAggregate[]> => {
      const { data, error } = await supabase
        .from('city_ytd_aggregate')
        .select('*')
        .order('year', { ascending: false })

      if (error) throw error
      return data as CityYtdAggregate[]
    },
  })
}

/**
 * Hook for fetching E-Profile aggregate data
 *
 * Returns revenue and EBITDA aggregated by E-Profile category.
 * Used for E-Profile analysis reporting.
 *
 * Usage:
 * ```tsx
 * const { data } = useEProfileAggregate('2025-01')
 * ```
 */
export function useEProfileAggregate(month?: string) {
  return useQuery({
    queryKey: ['city-aggregate', 'eprofile', month],
    queryFn: async (): Promise<EProfileMonthlyAggregate[]> => {
      let query = supabase
        .from('eprofile_monthly_aggregate')
        .select('*')
        .order('e_profile', { ascending: true })

      if (month) {
        query = query.eq('month', month)
      }

      const { data, error } = await query
      if (error) throw error
      return data as EProfileMonthlyAggregate[]
    },
    enabled: !!month,
  })
}

/**
 * Hook for fetching E-Profile aggregate data for a year
 *
 * Returns monthly E-Profile aggregates for all months in a year.
 *
 * Usage:
 * ```tsx
 * const { data } = useEProfileYearAggregate(2025)
 * ```
 */
export function useEProfileYearAggregate(year: number) {
  return useQuery({
    queryKey: ['city-aggregate', 'eprofile-year', year],
    queryFn: async (): Promise<EProfileMonthlyAggregate[]> => {
      const { data, error } = await supabase
        .from('eprofile_monthly_aggregate')
        .select('*')
        .gte('month', `${year}-01`)
        .lte('month', `${year}-12`)
        .order('month', { ascending: true })
        .order('e_profile', { ascending: true })

      if (error) throw error
      return data as EProfileMonthlyAggregate[]
    },
  })
}

/**
 * Hook for fetching year-over-year comparison data
 *
 * Returns monthly data for two consecutive years for comparison.
 *
 * Usage:
 * ```tsx
 * const { data } = useYearOverYearComparison(2025)
 * // Returns 2024 and 2025 data
 * ```
 */
export function useYearOverYearComparison(currentYear: number) {
  const previousYear = currentYear - 1

  return useQuery({
    queryKey: ['city-aggregate', 'yoy', currentYear],
    queryFn: async (): Promise<{
      currentYear: CityMonthlyAggregate[]
      previousYear: CityMonthlyAggregate[]
    }> => {
      // Fetch current year
      const { data: currentData, error: currentError } = await supabase
        .from('city_monthly_aggregate')
        .select('*')
        .gte('month', `${currentYear}-01`)
        .lte('month', `${currentYear}-12`)
        .order('month', { ascending: true })

      if (currentError) throw currentError

      // Fetch previous year
      const { data: previousData, error: previousError } = await supabase
        .from('city_monthly_aggregate')
        .select('*')
        .gte('month', `${previousYear}-01`)
        .lte('month', `${previousYear}-12`)
        .order('month', { ascending: true })

      if (previousError) throw previousError

      return {
        currentYear: currentData as CityMonthlyAggregate[],
        previousYear: previousData as CityMonthlyAggregate[],
      }
    },
  })
}
