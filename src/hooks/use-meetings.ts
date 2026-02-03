import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Meeting, MeetingStatus, MeetingType } from '@/types/database.types'

interface MeetingFilters {
  status?: MeetingStatus
  type?: MeetingType
  limit?: number
}

/**
 * Fetch all meetings with optional filters
 */
export function useMeetings(filters?: MeetingFilters) {
  return useQuery({
    queryKey: ['meetings', filters],
    queryFn: async () => {
      let query = supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.type) {
        query = query.eq('meeting_type', filters.type)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Meeting[]
    },
  })
}

/**
 * Fetch a single meeting by ID
 */
export function useMeeting(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: async () => {
      if (!meetingId) throw new Error('Meeting ID required')

      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single()

      if (error) throw error
      return data as Meeting
    },
    enabled: !!meetingId,
  })
}

/**
 * Search meetings using full-text search
 */
export function useSearchMeetings(searchQuery: string) {
  return useQuery({
    queryKey: ['meetings', 'search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) {
        // Return recent meetings if no search query
        const { data, error } = await supabase
          .from('meetings')
          .select('*')
          .order('meeting_date', { ascending: false })
          .limit(20)

        if (error) throw error
        return data as Meeting[]
      }

      // Use PostgreSQL full-text search
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .textSearch('title', searchQuery, { type: 'websearch' })
        .order('meeting_date', { ascending: false })
        .limit(20)

      if (error) {
        // Fallback to simple ILIKE search if full-text fails
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('meetings')
          .select('*')
          .or(`title.ilike.%${searchQuery}%,user_notes.ilike.%${searchQuery}%`)
          .order('meeting_date', { ascending: false })
          .limit(20)

        if (fallbackError) throw fallbackError
        return fallbackData as Meeting[]
      }

      return data as Meeting[]
    },
    enabled: true, // Always enabled, empty query returns recent meetings
  })
}

interface UpdateMeetingParams {
  meetingId: string
  userNotes?: string
  attendees?: string[]
  title?: string
}

/**
 * Save meeting notes (user notes alongside AI analysis)
 */
export function useSaveMeetingNotes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ meetingId, userNotes, attendees, title }: UpdateMeetingParams) => {
      const { data, error } = await supabase.functions.invoke('update-meeting', {
        body: { meetingId, userNotes, attendees, title },
      })

      if (error) throw new Error(error.message || 'Failed to save meeting notes')
      return data as Meeting
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      queryClient.invalidateQueries({ queryKey: ['meeting', data.id] })
    },
  })
}

interface FinalizeMeetingParams {
  meetingId: string
}

/**
 * Finalize a meeting (locks it for editing)
 */
export function useFinalizeMeeting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ meetingId }: FinalizeMeetingParams) => {
      const { data, error } = await supabase.functions.invoke('update-meeting', {
        body: { meetingId, finalize: true },
      })

      if (error) throw new Error(error.message || 'Failed to finalize meeting')
      return data as Meeting
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      queryClient.invalidateQueries({ queryKey: ['meeting', data.id] })
    },
  })
}

/**
 * Delete a meeting (only drafts can be deleted)
 */
export function useDeleteMeeting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (meetingId: string) => {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId)
        .eq('status', 'draft') // Only allow deleting drafts

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
    },
  })
}

/**
 * Get count of meetings by status
 */
export function useMeetingsCount(status?: MeetingStatus) {
  return useQuery({
    queryKey: ['meetings', 'count', status],
    queryFn: async () => {
      let query = supabase
        .from('meetings')
        .select('id', { count: 'exact', head: true })

      if (status) {
        query = query.eq('status', status)
      }

      const { count, error } = await query

      if (error) throw error
      return count ?? 0
    },
  })
}

/**
 * Get actions linked to a specific meeting
 */
export function useMeetingActions(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['actions', 'meeting', meetingId],
    queryFn: async () => {
      if (!meetingId) return []

      const { data, error } = await supabase
        .from('actions')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('due_date', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!meetingId,
  })
}
