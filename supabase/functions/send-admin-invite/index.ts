import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase environment variables not set' }),
        { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify the requesting user is a super_admin
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const userEmailLower = user.email?.toLowerCase()
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('role')
      .ilike('email', userEmailLower || '')
      .maybeSingle()

    console.log('Admin check for', userEmailLower, ':', adminCheck, adminError)

    if (adminError || !adminCheck || adminCheck.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Only super admins can invite new admins' }),
        { status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const { email, role } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: email' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const emailLower = email.toLowerCase().trim()
    const adminRole = role || 'consultant'

    // Check if email is already in admins table
    const { data: existingAdmin } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('email', emailLower)
      .maybeSingle()

    if (existingAdmin) {
      return new Response(
        JSON.stringify({ error: 'This email is already an admin' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Generate secure invite token
    const tokenBytes = new Uint8Array(32)
    crypto.getRandomValues(tokenBytes)
    const inviteToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')

    // Hash the token for storage
    const encoder = new TextEncoder()
    const data = encoder.encode(inviteToken)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

    // Expire any existing pending invitations for this email
    await supabaseAdmin
      .from('admin_invitations')
      .update({ status: 'expired' })
      .eq('email', emailLower)
      .eq('status', 'pending')

    // Create invitation (7 day expiry)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { error: insertError } = await supabaseAdmin
      .from('admin_invitations')
      .insert({
        email: emailLower,
        role: adminRole,
        token_hash: tokenHash,
        invited_by: user.id,
        expires_at: expiresAt,
      })

    if (insertError) {
      console.error('Insert invitation error:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create invitation' }),
        { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Build setup link
    const siteUrl = Deno.env.get('SITE_URL') || 'https://chester.benchiva.com'
    const setupLink = `${siteUrl}/admin/setup?token=${inviteToken}`

    const roleDisplay = adminRole === 'super_admin' ? 'Super Admin' : 'Consultant'

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="${siteUrl}/velocity-logo.png" alt="Velocity" style="height: 48px;">
  </div>

  <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">You've been invited as an Admin</h1>

  <p>Hello,</p>

  <p>You've been invited to join Chester Business Scorecard as a <strong>${roleDisplay}</strong>.</p>

  <p>Click the button below to set up your password and access the admin dashboard:</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${setupLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Set Up Your Account</a>
  </div>

  <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
  <p style="color: #2563eb; font-size: 14px; word-break: break-all;">${setupLink}</p>

  <p style="color: #666; font-size: 14px; margin-top: 30px;">This invitation link will expire in 7 days.</p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
</body>
</html>
`

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Chester Business Scorecard <noreply@chester.benchiva.com>',
        to: emailLower,
        subject: `You're invited to Chester Business Scorecard as ${roleDisplay}`,
        html: emailHtml,
      }),
    })

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text()
      console.error('Resend error:', resendError)
      return new Response(
        JSON.stringify({
          error: 'Failed to send email',
        }),
        { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation email sent successfully',
        email: emailLower,
        role: adminRole,
        emailSent: true,
      }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending admin invite:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to send invitation',
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    )
  }
})
