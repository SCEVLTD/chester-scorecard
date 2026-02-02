import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Action, ActionInsert } from '@/types/database.types'

/**
 * Create a new action for a business
 */
export function useCreateAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<ActionInsert, 'id' | 'created_at' | 'completed_at' | 'status'>) => {
      const { data: result, error } = await supabase
        .from('actions')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return result as Action
    },
    onSuccess: (data) => {
      // Invalidate business-specific and global queries
      queryClient.invalidateQueries({ queryKey: ['actions', data.business_id] })
      queryClient.invalidateQueries({ queryKey: ['actions', 'pending'] })
    },
  })
}

/**
 * Get pending actions for a specific business
 */
export function useBusinessPendingActions(businessId: string) {
  return useQuery({
    queryKey: ['actions', businessId, 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('actions')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'pending')
        .order('due_date', { ascending: true })

      if (error) throw error
      return data as Action[]
    },
    enabled: !!businessId,
  })
}

/**
 * Get count of pending actions for dashboard badge
 */
export function usePendingActionsCount(businessId?: string) {
  return useQuery({
    queryKey: businessId ? ['actions', businessId, 'count'] : ['actions', 'pending', 'count'],
    queryFn: async () => {
      let query = supabase
        .from('actions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (businessId) {
        query = query.eq('business_id', businessId)
      }

      const { count, error } = await query

      if (error) throw error
      return count ?? 0
    },
    enabled: businessId === undefined || !!businessId,
  })
}

/**
 * Mark an action as complete
 */
export function useCompleteAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (actionId: string) => {
      const { data, error } = await supabase
        .from('actions')
        .update({
          status: 'complete',
          completed_at: new Date().toISOString(),
        })
        .eq('id', actionId)
        .select()
        .single()

      if (error) throw error
      return data as Action
    },
    onSuccess: (data) => {
      // Invalidate all action queries
      queryClient.invalidateQueries({ queryKey: ['actions', data.business_id] })
      queryClient.invalidateQueries({ queryKey: ['actions', 'pending'] })
    },
  })
}
