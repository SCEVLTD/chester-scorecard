import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { writeAuditLog, getClientIp } from '../_shared/audit.ts'

/**
 * GDPR Data Export (Right to Portability)
 *
 * Exports all business data as a structured JSON file.
 * Authenticated users can export their own business data.
 * Admins can export any business.
 *
 * Request body:
 * - business_id: string (required) - The business to export data for
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase environment variables not set')
    }

    // Verify authentication
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorisation header' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { business_id } = await req.json()

    if (!business_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: business_id' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Authorisation check: user's business_id claim must match, or user must be admin
    const userBusinessId = user.app_metadata?.business_id
    let isAdmin = false

    const { data: adminCheck } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()

    if (adminCheck) {
      isAdmin = true
    }

    if (!isAdmin && userBusinessId !== business_id) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to export this data' }),
        { status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Fetch all business data
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', business_id)
      .maybeSingle()

    if (businessError || !business) {
      return new Response(
        JSON.stringify({ error: 'Business not found' }),
        { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Fetch scorecards
    const { data: scorecards } = await supabaseAdmin
      .from('scorecards')
      .select('*')
      .eq('business_id', business_id)
      .order('month', { ascending: false })

    // Fetch data requests
    const { data: dataRequests } = await supabaseAdmin
      .from('data_requests')
      .select('*')
      .eq('business_id', business_id)
      .order('month', { ascending: false })

    // Fetch company submissions via data requests
    let submissions: Record<string, unknown>[] = []
    if (dataRequests && dataRequests.length > 0) {
      const dataRequestIds = dataRequests.map((dr: { id: string }) => dr.id)
      const { data: submissionData } = await supabaseAdmin
        .from('company_submissions')
        .select('*')
        .in('data_request_id', dataRequestIds)

      submissions = submissionData || []
    }

    // Fetch targets
    const { data: targets } = await supabaseAdmin
      .from('targets')
      .select('*')
      .eq('business_id', business_id)
      .order('year', { ascending: false })

    // Fetch company emails
    const { data: companyEmails } = await supabaseAdmin
      .from('company_emails')
      .select('*')
      .eq('business_id', business_id)

    // Build export payload
    const exportDate = new Date().toISOString()
    const exportData = {
      exportDate,
      business: business,
      scorecards: scorecards || [],
      submissions: submissions,
      targets: targets || [],
      dataRequests: dataRequests || [],
      companyEmails: companyEmails || [],
    }

    // Write audit log
    writeAuditLog(supabaseAdmin, {
      userId: user.id,
      userEmail: user.email || null,
      userRole: isAdmin ? 'admin' : 'business_user',
      action: 'export_user_data',
      resourceType: 'business',
      resourceId: business_id,
      metadata: {
        scorecardCount: (scorecards || []).length,
        submissionCount: submissions.length,
        targetCount: (targets || []).length,
        dataRequestCount: (dataRequests || []).length,
      },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get('user-agent'),
    })

    // Format date for filename
    const dateStr = new Date().toISOString().split('T')[0]

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        ...getCorsHeaders(req),
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="business-data-export-${dateStr}.json"`,
      },
    })

  } catch (error) {
    console.error('Error exporting user data:', error)

    return new Response(
      JSON.stringify({ error: 'Failed to export data' }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    )
  }
})
