import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Send a password setup invitation email to a company.
 * Uses Supabase's built-in inviteUserByEmail which handles user creation AND email sending.
 * Falls back to password reset for existing users.
 *
 * Request body:
 * - email: string (required) - The company email address
 * - business_id: string (required) - The business ID for verification
 * - business_name: string (optional) - For personalized email (not used with built-in emails)
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase environment variables not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the request has authorization (admin only)
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify caller is authenticated
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user's email is in the admins table
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()

    if (adminError || !adminCheck) {
      return new Response(
        JSON.stringify({ error: 'Only admins can send company invites' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { email, business_id } = await req.json()

    if (!email || !business_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, business_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailLower = email.toLowerCase().trim()

    // Verify the email belongs to the business
    const { data: emailRecord, error: emailError } = await supabaseAdmin
      .from('company_emails')
      .select('id')
      .eq('business_id', business_id)
      .eq('email', emailLower)
      .maybeSingle()

    if (emailError || !emailRecord) {
      return new Response(
        JSON.stringify({ error: 'Email not found for this business' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://chester.benchiva.com'

    // Try inviteUserByEmail first - this creates user AND sends email automatically
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(emailLower, {
      data: {
        business_id,
        role: 'company',
      },
      redirectTo: `${siteUrl}/company/login`,
    })

    if (inviteError) {
      // If user already exists, send password reset instead
      if (inviteError.message.includes('already been registered') ||
          inviteError.message.includes('already exists') ||
          inviteError.message.includes('User already registered')) {

        // Use resetPasswordForEmail which sends email automatically
        const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(emailLower, {
          redirectTo: `${siteUrl}/company/login`,
        })

        if (resetError) {
          console.error('Reset password error:', resetError)
          return new Response(
            JSON.stringify({ error: `Failed to send reset email: ${resetError.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Password reset email sent successfully',
            email: emailLower,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.error('Invite error:', inviteError)
      return new Response(
        JSON.stringify({ error: `Failed to send invite: ${inviteError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation email sent successfully',
        email: emailLower,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending company invite:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to send invitation',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
