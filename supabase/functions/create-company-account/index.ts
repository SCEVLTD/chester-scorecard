import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Create a Supabase Auth account for a company email.
 * This allows companies to log in with email + password.
 *
 * Request body:
 * - email: string (required) - The company email address
 * - password: string (required) - The password to set
 * - business_id: string (required) - The business ID for verification
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
      throw new Error('Supabase environment variables not set')
    }

    // Verify the request has authorization (admin only)
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract JWT token from Bearer header
    const token = authHeader.replace('Bearer ', '')

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Get user from the JWT token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      console.error('Auth error:', userError)
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
      console.error('Admin check error:', adminError, 'User email:', user.email)
      return new Response(
        JSON.stringify({ error: 'Only admins can create company accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { email, password, business_id } = await req.json()

    if (!email || !password || !business_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, business_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the email belongs to the business
    const { data: emailRecord, error: emailError } = await supabaseAdmin
      .from('company_emails')
      .select('id')
      .eq('business_id', business_id)
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (emailError || !emailRecord) {
      return new Response(
        JSON.stringify({ error: 'Email not found for this business' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (existingUser) {
      // User exists - update their password instead
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password }
      )

      if (updateError) {
        console.error('Failed to update user password:', updateError)
        return new Response(
          JSON.stringify({ error: `Failed to update password: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Password updated for existing account',
          user_id: existingUser.id,
          email: email.toLowerCase(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create new auth user
    // IMPORTANT: Use app_metadata (not user_metadata) so business_id appears in JWT claims
    // RLS policies use get_my_business_id() which reads from JWT claims root level
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm the email
      app_metadata: {
        business_id,
        user_role: 'company',
      },
    })

    if (createError) {
      console.error('Failed to create user:', createError)
      return new Response(
        JSON.stringify({ error: `Failed to create account: ${createError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Company account created successfully',
        user_id: newUser.user.id,
        email: email.toLowerCase(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating company account:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to create company account',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
