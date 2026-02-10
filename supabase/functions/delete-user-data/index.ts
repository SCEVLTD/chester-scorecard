import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { writeAuditLog, getClientIp } from '../_shared/audit.ts'

/**
 * GDPR Account Deletion (Right to Erasure)
 *
 * Deletes all business data and optionally the user's auth account.
 * Business users can delete their own data.
 * Admins can delete any business.
 *
 * Request body:
 * - business_id: string (required) - The business to delete
 * - confirm: boolean (required) - Must be true to proceed
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
    const { business_id, confirm } = await req.json()

    if (!business_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: business_id' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    if (confirm !== true) {
      return new Response(
        JSON.stringify({ error: 'Deletion requires confirm: true' }),
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
        JSON.stringify({ error: 'You do not have permission to delete this data' }),
        { status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Verify business exists
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', business_id)
      .maybeSingle()

    if (businessError || !business) {
      return new Response(
        JSON.stringify({ error: 'Business not found' }),
        { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Track deletion counts for the summary
    const deletionSummary: Record<string, number> = {}

    // 1. Delete scorecards
    const { data: deletedScorecards } = await supabaseAdmin
      .from('scorecards')
      .delete()
      .eq('business_id', business_id)
      .select('id')

    deletionSummary.scorecards = deletedScorecards?.length || 0

    // 2. Delete company_submissions via data_requests
    const { data: dataRequests } = await supabaseAdmin
      .from('data_requests')
      .select('id')
      .eq('business_id', business_id)

    let submissionsDeleted = 0
    if (dataRequests && dataRequests.length > 0) {
      const dataRequestIds = dataRequests.map((dr: { id: string }) => dr.id)
      const { data: deletedSubmissions } = await supabaseAdmin
        .from('company_submissions')
        .delete()
        .in('data_request_id', dataRequestIds)
        .select('id')

      submissionsDeleted = deletedSubmissions?.length || 0
    }
    deletionSummary.companySubmissions = submissionsDeleted

    // 3. Delete data_requests
    const { data: deletedDataRequests } = await supabaseAdmin
      .from('data_requests')
      .delete()
      .eq('business_id', business_id)
      .select('id')

    deletionSummary.dataRequests = deletedDataRequests?.length || 0

    // 4. Delete targets
    const { data: deletedTargets } = await supabaseAdmin
      .from('targets')
      .delete()
      .eq('business_id', business_id)
      .select('id')

    deletionSummary.targets = deletedTargets?.length || 0

    // 5. Delete company_emails
    const { data: deletedEmails } = await supabaseAdmin
      .from('company_emails')
      .delete()
      .eq('business_id', business_id)
      .select('id')

    deletionSummary.companyEmails = deletedEmails?.length || 0

    // 6. Delete invitations
    const { data: deletedInvitations } = await supabaseAdmin
      .from('invitations')
      .delete()
      .eq('business_id', business_id)
      .select('id')

    deletionSummary.invitations = deletedInvitations?.length || 0

    // 7. Delete the business record itself
    const { error: deleteBusinessError } = await supabaseAdmin
      .from('businesses')
      .delete()
      .eq('id', business_id)

    if (deleteBusinessError) {
      console.error('Failed to delete business record:', deleteBusinessError)
      return new Response(
        JSON.stringify({ error: 'Failed to complete deletion' }),
        { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }
    deletionSummary.business = 1

    // 8. If requesting user is a business_user (not admin), delete their auth account
    let authAccountDeleted = false
    if (!isAdmin) {
      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
      if (deleteUserError) {
        console.error('Failed to delete auth account:', deleteUserError)
        // Don't fail the response - data is already deleted, log the issue
      } else {
        authAccountDeleted = true
      }
    }

    // Write anonymised audit log (no PII, just business_id and counts)
    const totalRecordsDeleted = Object.values(deletionSummary).reduce((sum, count) => sum + count, 0)

    writeAuditLog(supabaseAdmin, {
      userId: isAdmin ? user.id : null,
      userEmail: isAdmin ? (user.email || null) : null,
      userRole: isAdmin ? 'admin' : 'business_user',
      action: 'delete_user_data',
      resourceType: 'business',
      resourceId: business_id,
      metadata: {
        totalRecordsDeleted,
        deletionSummary,
        authAccountDeleted,
      },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get('user-agent'),
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'All business data has been permanently deleted',
        summary: deletionSummary,
        authAccountDeleted,
      }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error deleting user data:', error)

    return new Response(
      JSON.stringify({ error: 'Failed to delete data' }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    )
  }
})
