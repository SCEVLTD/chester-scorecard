/**
 * React Query hook for submission status
 * Fetches all businesses and determines which have submitted data for a given month
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface BusinessSubmissionStatus {
  id: string
  name: string
  submitted: boolean
}

export function useSubmissionStatus(month: string) {
  return useQuery({
    queryKey: ['submission-status', month],
    queryFn: async () => {
      // 1. Fetch all businesses
      const { data: businesses, error: businessesError } = await supabase
        .from('businesses')
        .select('id, name')
        .order('name')

      if (businessesError) throw businessesError
      if (!businesses) return []

      // 2. Fetch submitted data_requests for this month
      const { data: dataRequests, error: dataRequestsError } = await supabase
        .from('data_requests')
        .select('business_id')
        .eq('month', month)
        .eq('status', 'submitted')

      if (dataRequestsError) throw dataRequestsError

      // 3. Create Set of submitted business IDs
      const submittedBusinessIds = new Set(
        dataRequests?.map((dr) => dr.business_id) || []
      )

      // 4. Return array with submission status
      return businesses.map((business) => ({
        id: business.id,
        name: business.name,
        submitted: submittedBusinessIds.has(business.id),
      }))
    },
  })
}
