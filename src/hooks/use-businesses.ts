import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Business, BusinessInsert } from '@/types/database.types'

export function useBusinesses() {
  return useQuery({
    queryKey: ['businesses'],
    queryFn: async (): Promise<Business[]> => {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .order('name')
      if (error) throw error
      return data as Business[]
    },
  })
}

export function useCreateBusiness() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { name: string; contact_email?: string; contact_name?: string }): Promise<Business> => {
      const insert: BusinessInsert = {
        name: params.name,
        contact_email: params.contact_email || null,
        contact_name: params.contact_name || null,
      }
      const { data, error } = await supabase
        .from('businesses')
        .insert(insert)
        .select()
        .single()
      if (error) throw error
      return data as Business
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
    },
  })
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      businessId,
      updates,
    }: {
      businessId: string
      updates: { name?: string; contact_email?: string | null; contact_name?: string | null }
    }): Promise<Business> => {
      const { data, error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', businessId)
        .select()
        .single()
      if (error) throw error
      return data as Business
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
    },
  })
}

export function useUpdateBusinessSector() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      businessId,
      sectorId,
    }: {
      businessId: string
      sectorId: string | null
    }): Promise<Business> => {
      const { data, error } = await supabase
        .from('businesses')
        .update({ sector_id: sectorId })
        .eq('id', businessId)
        .select()
        .single()
      if (error) throw error
      return data as Business
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
    },
  })
}

export function useDeleteBusiness() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (businessId: string): Promise<void> => {
      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', businessId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
    },
  })
}
