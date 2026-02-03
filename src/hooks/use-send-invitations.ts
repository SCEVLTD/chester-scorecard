import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface SendInvitationsResult {
  sent: number
  total: number
  month: string
  results: Array<{
    business_id: string
    business_name: string
    status: number
    ok: boolean
    error?: string
  }>
  errors?: string[]
}

export function useSendInvitations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<SendInvitationsResult> => {
      const { data, error } = await supabase.functions.invoke('send-invitations')
      if (error) throw error
      return data as SendInvitationsResult
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['data-requests'] })
      queryClient.invalidateQueries({ queryKey: ['submission-status'] })

      // Show success toast
      toast.success(`Sent ${data.sent} invitation${data.sent !== 1 ? 's' : ''} successfully`)

      // Show error toast if any failed
      if (data.errors && data.errors.length > 0) {
        toast.error(`${data.errors.length} failed:\n${data.errors.join('\n')}`)
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to send invitations')
    },
  })
}
