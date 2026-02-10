import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import type { Organisation } from '@/types/database.types'

export function useOrganisation() {
  const { organisationId } = useAuth()

  return useQuery({
    queryKey: ['organisation', organisationId],
    queryFn: async (): Promise<Organisation | null> => {
      if (!organisationId) return null
      const { data, error } = await supabase
        .from('organisations')
        .select('*')
        .eq('id', organisationId)
        .maybeSingle()
      if (error) throw error
      return data as Organisation | null
    },
    enabled: !!organisationId,
    staleTime: 10 * 60 * 1000, // 10 minutes - org data changes rarely
  })
}
