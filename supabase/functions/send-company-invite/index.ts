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

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()

    if (adminError || !adminCheck) {
      return new Response(
        JSON.stringify({ error: 'Only admins can send company invites' }),
        { status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const { email, business_id } = await req.json()

    if (!email || !business_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, business_id' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const emailLower = email.toLowerCase().trim()

    const { data: emailRecord, error: emailError } = await supabaseAdmin
      .from('company_emails')
      .select('id')
      .eq('business_id', business_id)
      .ilike('email', emailLower)
      .maybeSingle()

    if (emailError || !emailRecord) {
      return new Response(
        JSON.stringify({ error: 'Email not found for this business' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('name')
      .eq('id', business_id)
      .single()

    const businessName = business?.name || 'Your Company'

    const tokenBytes = new Uint8Array(32)
    crypto.getRandomValues(tokenBytes)
    const inviteToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')

    const encoder = new TextEncoder()
    const data = encoder.encode(inviteToken)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

    await supabaseAdmin
      .from('invitations')
      .update({ status: 'expired' })
      .eq('email', emailLower)
      .eq('business_id', business_id)
      .eq('status', 'pending')

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { error: insertError } = await supabaseAdmin
      .from('invitations')
      .insert({
        email: emailLower,
        business_id,
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

    const siteUrl = Deno.env.get('SITE_URL') || 'https://chester.benchiva.com'
    const setupLink = `${siteUrl}/company/setup?token=${inviteToken}`

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

  <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">You're invited to Chester Business Scorecard</h1>

  <p>Hello,</p>

  <p>You've been invited to access the business scorecard for <strong>${businessName}</strong>.</p>

  <p>Click the button below to set up your password and access your dashboard:</p>

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
        subject: `You're invited to ${businessName}'s Business Scorecard`,
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
        emailSent: true,
      }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending company invite:', error)

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
