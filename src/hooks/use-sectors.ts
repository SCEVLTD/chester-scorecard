import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Sector } from '@/types/database.types'

export function useSectors() {
  return useQuery({
    queryKey: ['sectors'],
    queryFn: async (): Promise<Sector[]> => {
      const { data, error } = await supabase
        .from('sectors')
        .select('*')
        .order('name')
      if (error) throw error
      return data as Sector[]
    },
  })
}
