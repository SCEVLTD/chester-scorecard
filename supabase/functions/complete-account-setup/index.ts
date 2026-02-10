import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

/**
 * Complete account setup - validates invitation token and creates user account.
 * This is called when a user submits their password on the setup page.
 *
 * Two modes:
 * 1. GET with token query param - Validates token, returns business info (doesn't consume token)
 * 2. POST with token + password - Creates account and consumes token
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase environment variables not set' }),
        { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Hash a token for lookup
    const hashToken = async (token: string): Promise<string> => {
      const encoder = new TextEncoder()
      const data = encoder.encode(token)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
    }

    // GET: Validate token and return info (doesn't consume)
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const token = url.searchParams.get('token')

      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Missing token parameter' }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }

      const tokenHash = await hashToken(token)

      // Find the invitation
      const { data: invitation, error: inviteError } = await supabaseAdmin
        .from('invitations')
        .select('id, email, business_id, status, expires_at')
        .eq('token_hash', tokenHash)
        .maybeSingle()

      if (inviteError || !invitation) {
        return new Response(
          JSON.stringify({ error: 'Invalid invitation link', code: 'INVALID_TOKEN' }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }

      // Check status
      if (invitation.status === 'accepted') {
        return new Response(
          JSON.stringify({ error: 'This invitation has already been used', code: 'ALREADY_USED' }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }

      if (invitation.status === 'expired') {
        return new Response(
          JSON.stringify({ error: 'This invitation has expired', code: 'EXPIRED' }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }

      // Check expiry
      if (new Date(invitation.expires_at) < new Date()) {
        // Mark as expired
        await supabaseAdmin
          .from('invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id)

        return new Response(
          JSON.stringify({ error: 'This invitation has expired', code: 'EXPIRED' }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }

      // Get business name
      const { data: business } = await supabaseAdmin
        .from('businesses')
        .select('name')
        .eq('id', invitation.business_id)
        .single()

      return new Response(
        JSON.stringify({
          valid: true,
          email: invitation.email,
          businessName: business?.name || 'Your Company',
          businessId: invitation.business_id,
        }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // POST: Complete setup (creates user and consumes token)
    if (req.method === 'POST') {
      const { token, password } = await req.json()

      if (!token || !password) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: token, password' }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }

      if (password.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Password must be at least 6 characters' }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }

      const tokenHash = await hashToken(token)

      // Find and validate invitation
      const { data: invitation, error: inviteError } = await supabaseAdmin
        .from('invitations')
        .select('id, email, business_id, status, expires_at')
        .eq('token_hash', tokenHash)
        .eq('status', 'pending')
        .maybeSingle()

      if (inviteError || !invitation) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired invitation link' }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }

      // Check expiry
      if (new Date(invitation.expires_at) < new Date()) {
        await supabaseAdmin
          .from('invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id)

        return new Response(
          JSON.stringify({ error: 'This invitation has expired' }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }

      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === invitation.email.toLowerCase())

      let userId: string

      if (existingUser) {
        // User exists - update their password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          { password }
        )

        if (updateError) {
          console.error('Update user error:', updateError)
          return new Response(
            JSON.stringify({ error: 'Failed to update password' }),
            { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          )
        }

        userId = existingUser.id
      } else {
        // Create new user with email auto-confirmed
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: invitation.email,
          password,
          email_confirm: true,
          user_metadata: {
            business_id: invitation.business_id,
          }
        })

        if (createError || !newUser.user) {
          console.error('Create user error:', createError)
          return new Response(
            JSON.stringify({ error: 'Failed to create account' }),
            { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          )
        }

        userId = newUser.user.id
      }

      // Mark invitation as accepted
      await supabaseAdmin
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id)

      // Sign in the user to get session tokens
      const { data: session, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: invitation.email,
        password,
      })

      if (signInError || !session.session) {
        // Account created but sign-in failed - user can login manually
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Account created. Please login with your new password.',
            redirectToLogin: true,
          }),
          { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }

      // Return session for auto-login
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Account setup complete',
          session: {
            access_token: session.session.access_token,
            refresh_token: session.session.refresh_token,
          },
        }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in complete-account-setup:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to complete setup',
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    )
  }
})
