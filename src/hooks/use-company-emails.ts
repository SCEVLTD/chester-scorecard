import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface CompanyEmail {
  id: string
  business_id: string
  email: string
  is_primary: boolean
  created_at: string
}

export function useCompanyEmails(businessId: string | null) {
  return useQuery({
    queryKey: ['company-emails', businessId],
    queryFn: async (): Promise<CompanyEmail[]> => {
      if (!businessId) return []
      const { data, error } = await supabase
        .from('company_emails')
        .select('*')
        .eq('business_id', businessId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as CompanyEmail[]
    },
    enabled: !!businessId,
  })
}

export function useAddCompanyEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ businessId, email }: { businessId: string; email: string }) => {
      const { data, error } = await supabase
        .from('company_emails')
        .insert({ business_id: businessId, email })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { businessId }) => {
      queryClient.invalidateQueries({ queryKey: ['company-emails', businessId] })
    },
  })
}

export function useRemoveCompanyEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ emailId }: { emailId: string; businessId: string }) => {
      const { error } = await supabase
        .from('company_emails')
        .delete()
        .eq('id', emailId)
      if (error) throw error
    },
    onSuccess: (_, { businessId }) => {
      queryClient.invalidateQueries({ queryKey: ['company-emails', businessId] })
    },
  })
}

export function useSetPrimaryEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ emailId, businessId }: { emailId: string; businessId: string }) => {
      // First, set all emails to non-primary
      await supabase
        .from('company_emails')
        .update({ is_primary: false })
        .eq('business_id', businessId)

      // Then set the selected email as primary
      const { error } = await supabase
        .from('company_emails')
        .update({ is_primary: true })
        .eq('id', emailId)
      if (error) throw error
    },
    onSuccess: (_, { businessId }) => {
      queryClient.invalidateQueries({ queryKey: ['company-emails', businessId] })
    },
  })
}

interface CreateAccountResponse {
  success: boolean
  message: string
  user_id: string
  email: string
  error?: string
}

export function useCreateCompanyAccount() {
  return useMutation({
    mutationFn: async ({
      email,
      password,
      businessId,
    }: {
      email: string
      password: string
      businessId: string
    }): Promise<CreateAccountResponse> => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await supabase.functions.invoke('create-company-account', {
        body: {
          email,
          password,
          business_id: businessId,
        },
      })

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create account')
      }

      const data = response.data as CreateAccountResponse
      if (data.error) {
        throw new Error(data.error)
      }

      return data
    },
  })
}

interface SendInviteResponse {
  success: boolean
  message: string
  email: string
  error?: string
}

export function useSendCompanyInvite() {
  return useMutation({
    mutationFn: async ({
      email,
      businessId,
      businessName,
    }: {
      email: string
      businessId: string
      businessName?: string
    }): Promise<SendInviteResponse> => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await supabase.functions.invoke('send-company-invite', {
        body: {
          email,
          business_id: businessId,
          business_name: businessName,
        },
      })

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send invite')
      }

      const data = response.data as SendInviteResponse
      if (data.error) {
        throw new Error(data.error)
      }

      return data
    },
  })
}
