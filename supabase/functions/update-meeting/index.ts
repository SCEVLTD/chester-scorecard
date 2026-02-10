import { createClient } from 'npm:@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  meetingId: string
  userNotes?: string
  attendees?: string[]
  title?: string
  finalize?: boolean
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    const body = await req.json() as RequestBody
    const { meetingId, userNotes, attendees, title, finalize } = body

    if (!meetingId) {
      return new Response(
        JSON.stringify({ error: 'meetingId is required' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Get user email from JWT
    const authHeader = req.headers.get('authorization')
    let userEmail = 'system'

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user } } = await supabase.auth.getUser(token)
        if (user?.email) {
          userEmail = user.email
        }
      } catch (e) {
        console.warn('Could not extract user email from token:', e)
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {}

    if (userNotes !== undefined) {
      updateData.user_notes = userNotes
    }

    if (attendees !== undefined) {
      updateData.attendees = attendees
    }

    if (title !== undefined) {
      updateData.title = title
    }

    if (finalize) {
      updateData.status = 'finalized'
      updateData.finalized_at = new Date().toISOString()
      updateData.finalized_by = userEmail
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return new Response(
        JSON.stringify({ error: 'No fields to update' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Verify meeting exists and is not already finalized (if we're trying to update notes)
    const { data: existingMeeting, error: fetchError } = await supabase
      .from('meetings')
      .select('id, status')
      .eq('id', meetingId)
      .single()

    if (fetchError || !existingMeeting) {
      return new Response(
        JSON.stringify({ error: 'Meeting not found' }),
        { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Don't allow updating notes on finalized meetings (unless we're finalizing)
    if (existingMeeting.status === 'finalized' && !finalize && (userNotes !== undefined || attendees !== undefined)) {
      return new Response(
        JSON.stringify({ error: 'Cannot update finalized meeting' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Update the meeting
    const { data: meeting, error: updateError } = await supabase
      .from('meetings')
      .update(updateData)
      .eq('id', meetingId)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update meeting:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update meeting' }),
        { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify(meeting), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error updating meeting:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to update meeting',
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      }
    )
  }
})
