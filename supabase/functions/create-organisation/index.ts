import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { writeAuditLog, getClientIp } from '../_shared/audit.ts'

/**
 * Create a new organisation with its first admin user.
 * This is a PUBLIC endpoint (no auth required) - used for self-service registration.
 *
 * Request body:
 * - organisationName: string (required) - The organisation display name
 * - adminEmail: string (required) - Email for the first admin user
 * - adminName: string (required) - Full name of the first admin
 * - password: string (required) - Password for the admin account (min 12 chars)
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  const corsHeaders = getCorsHeaders(req)
  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase environment variables not set')
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Parse and validate request body
    const body = await req.json()
    const { organisationName, adminEmail, adminName, password } = body

    if (!organisationName || !adminEmail || !adminName || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: organisationName, adminEmail, adminName, password' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    // Validate organisation name length
    const trimmedOrgName = organisationName.trim()
    if (trimmedOrgName.length < 2 || trimmedOrgName.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Organisation name must be between 2 and 100 characters' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const trimmedEmail = adminEmail.trim().toLowerCase()
    if (!emailRegex.test(trimmedEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    // Validate password strength
    if (password.length < 12) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 12 characters' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    // Check password complexity (at least one letter and one number)
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return new Response(
        JSON.stringify({ error: 'Password must contain at least one letter and one number' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    // Generate slug from organisation name
    const slug = trimmedOrgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Check for duplicate organisation name or slug
    const { data: existingOrg } = await supabaseAdmin
      .from('organisations')
      .select('id')
      .or(`slug.eq.${slug},name.ilike.${trimmedOrgName}`)
      .maybeSingle()

    if (existingOrg) {
      return new Response(
        JSON.stringify({ error: 'An organisation with this name already exists' }),
        { status: 409, headers: jsonHeaders }
      )
    }

    // Check for duplicate email in auth users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === trimmedEmail
    )

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'An account with this email address already exists' }),
        { status: 409, headers: jsonHeaders }
      )
    }

    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    // 1. Create the organisation
    const { data: newOrg, error: orgError } = await supabaseAdmin
      .from('organisations')
      .insert({
        name: trimmedOrgName,
        slug,
        settings: {
          trial_ends_at: trialEndsAt.toISOString(),
          plan: 'trial',
          max_businesses: 5,
          max_admins: 2,
        },
        branding: {},
      })
      .select('id')
      .single()

    if (orgError || !newOrg) {
      console.error('Failed to create organisation:', orgError)
      return new Response(
        JSON.stringify({ error: 'Failed to create organisation' }),
        { status: 500, headers: jsonHeaders }
      )
    }

    // 2. Create the auth user
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: trimmedEmail,
      password,
      email_confirm: true,
      app_metadata: {
        user_role: 'super_admin',
        organisation_id: newOrg.id,
      },
    })

    if (createUserError || !newUser?.user) {
      console.error('Failed to create auth user:', createUserError)
      // Rollback: delete the organisation we just created
      await supabaseAdmin.from('organisations').delete().eq('id', newOrg.id)
      return new Response(
        JSON.stringify({ error: 'Failed to create admin account' }),
        { status: 500, headers: jsonHeaders }
      )
    }

    // 3. Create the admin record linked to the organisation
    const { error: adminError } = await supabaseAdmin
      .from('admins')
      .insert({
        email: trimmedEmail,
        name: adminName.trim(),
        role: 'super_admin',
        organisation_id: newOrg.id,
      })

    if (adminError) {
      console.error('Failed to create admin record:', adminError)
      // Rollback: delete auth user and organisation
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      await supabaseAdmin.from('organisations').delete().eq('id', newOrg.id)
      return new Response(
        JSON.stringify({ error: 'Failed to create admin record' }),
        { status: 500, headers: jsonHeaders }
      )
    }

    // Write audit log
    await writeAuditLog(supabaseAdmin, {
      userId: newUser.user.id,
      userEmail: trimmedEmail,
      userRole: 'super_admin',
      action: 'organisation_created',
      resourceType: 'organisation',
      resourceId: newOrg.id,
      metadata: {
        organisationName: trimmedOrgName,
        slug,
        trialEndsAt: trialEndsAt.toISOString(),
      },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get('user-agent'),
    })

    return new Response(
      JSON.stringify({
        success: true,
        organisationId: newOrg.id,
        adminId: newUser.user.id,
        trialEndsAt: trialEndsAt.toISOString(),
      }),
      { headers: jsonHeaders }
    )
  } catch (error) {
    console.error('Error creating organisation:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create organisation' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
