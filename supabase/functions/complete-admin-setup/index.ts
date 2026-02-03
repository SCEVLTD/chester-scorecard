import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // GET request - validate token
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url)
      const token = url.searchParams.get('token')

      if (!token) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Missing token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Hash the token to compare
      const encoder = new TextEncoder()
      const data = encoder.encode(token)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

      // Find invitation
      const { data: invitation, error } = await supabaseAdmin
        .from('admin_invitations')
        .select('*')
        .eq('token_hash', tokenHash)
        .maybeSingle()

      if (error || !invitation) {
        return new Response(
          JSON.stringify({ valid: false, code: 'INVALID' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if already used
      if (invitation.status === 'accepted') {
        return new Response(
          JSON.stringify({ valid: false, code: 'ALREADY_USED' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if expired
      if (new Date(invitation.expires_at) < new Date() || invitation.status === 'expired') {
        return new Response(
          JSON.stringify({ valid: false, code: 'EXPIRED' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const roleDisplay = invitation.role === 'super_admin' ? 'Super Admin' : 'Consultant'

      return new Response(
        JSON.stringify({
          valid: true,
          email: invitation.email,
          role: invitation.role,
          roleDisplay,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error) {
      console.error('Token validation error:', error)
      return new Response(
        JSON.stringify({ valid: false, error: 'Validation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  // POST request - complete account setup
  if (req.method === 'POST') {
    try {
      const { token, password } = await req.json()

      if (!token || !password) {
        return new Response(
          JSON.stringify({ error: 'Missing token or password' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (password.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Password must be at least 6 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Hash the token to compare
      const encoder = new TextEncoder()
      const data = encoder.encode(token)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

      // Find invitation
      const { data: invitation, error: invError } = await supabaseAdmin
        .from('admin_invitations')
        .select('*')
        .eq('token_hash', tokenHash)
        .eq('status', 'pending')
        .maybeSingle()

      if (invError || !invitation) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired invitation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check expiry
      if (new Date(invitation.expires_at) < new Date()) {
        await supabaseAdmin
          .from('admin_invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id)

        return new Response(
          JSON.stringify({ error: 'Invitation has expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: invitation.email,
        password: password,
        email_confirm: true,
      })

      if (authError) {
        // If user already exists, try to update password
        if (authError.message.includes('already been registered')) {
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
          const existingUser = existingUsers?.users.find(u => u.email === invitation.email)

          if (existingUser) {
            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
              password: password,
            })
          }
        } else {
          console.error('Auth user creation error:', authError)
          return new Response(
            JSON.stringify({ error: 'Failed to create account: ' + authError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // Add to admins table
      const { error: adminInsertError } = await supabaseAdmin
        .from('admins')
        .insert({
          email: invitation.email,
          role: invitation.role,
        })

      if (adminInsertError && !adminInsertError.message.includes('duplicate')) {
        console.error('Admin insert error:', adminInsertError)
        return new Response(
          JSON.stringify({ error: 'Failed to add admin record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Mark invitation as accepted
      await supabaseAdmin
        .from('admin_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id)

      // Sign in the user and return session
      const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: invitation.email,
        password: password,
      })

      if (signInError || !signInData.session) {
        // If auto-login fails, redirect to login page
        return new Response(
          JSON.stringify({
            success: true,
            redirectToLogin: true,
            message: 'Account created. Please log in.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          session: signInData.session,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error) {
      console.error('Account setup error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to complete setup' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
