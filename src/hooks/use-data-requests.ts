import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DataRequest, DataRequestInsert, Business } from '@/types/database.types'
import { generateToken, calculateExpiry } from '@/lib/magic-link'

/**
 * Create a new data request (magic link) for a business
 */
export function useCreateDataRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      businessId,
      month,
      createdBy,
    }: {
      businessId: string
      month: string
      createdBy: string
    }) => {
      const token = generateToken()
      const expiresAt = calculateExpiry(7) // 7 days

      const insert: DataRequestInsert = {
        business_id: businessId,
        month,
        token,
        expires_at: expiresAt,
        created_by: createdBy,
      }

      const { data, error } = await supabase
        .from('data_requests')
        .insert(insert)
        .select()
        .single()

      if (error) throw error
      return data as DataRequest
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['data-requests', data.business_id] })
    },
  })
}

/**
 * Get all data requests for a business
 */
export function useBusinessDataRequests(businessId: string) {
  return useQuery({
    queryKey: ['data-requests', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_requests')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as DataRequest[]
    },
    enabled: !!businessId,
  })
}

/**
 * Validate a token and get the data request with business info
 * Used on public submission page
 */
export function useDataRequestByToken(token: string) {
  return useQuery({
    queryKey: ['data-request', 'token', token],
    queryFn: async () => {
      // Get the data request
      const { data: request, error: requestError } = await supabase
        .from('data_requests')
        .select('*')
        .eq('token', token)
        .single()

      if (requestError) throw requestError
      if (!request) return null

      const dataRequest = request as DataRequest

      // Get the business info
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', dataRequest.business_id)
        .single()

      if (businessError) throw businessError

      return {
        dataRequest,
        business: business as Business,
      }
    },
    enabled: !!token,
    retry: false, // Don't retry on invalid tokens
  })
}

/**
 * Update data request status
 */
export function useUpdateDataRequestStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string
      status: 'pending' | 'submitted' | 'used'
    }) => {
      const { data, error } = await supabase
        .from('data_requests')
        .update({ status })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as DataRequest
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['data-requests', data.business_id] })
      queryClient.invalidateQueries({ queryKey: ['data-request', 'token', data.token] })
    },
  })
}
