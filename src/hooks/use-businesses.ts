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
    mutationFn: async (name: string): Promise<Business> => {
      const insert: BusinessInsert = { name }
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
