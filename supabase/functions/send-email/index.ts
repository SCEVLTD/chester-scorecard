import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

const resendApiKey = Deno.env.get('RESEND_API_KEY')
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')?.replace('v1,whsec_', '')

interface EmailData {
  token: string
  token_hash: string
  redirect_to: string
  email_action_type: 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email_change'
  site_url: string
  token_new?: string
  token_hash_new?: string
}

interface User {
  email: string
  user_metadata?: {
    business_id?: string
    role?: string
  }
}

interface WebhookPayload {
  user: User
  email_data: EmailData
}

const siteUrl = Deno.env.get('SITE_URL') || 'https://chester.benchiva.com'

/**
 * Build the confirmation URL for the email action
 */
function buildConfirmationUrl(emailData: EmailData): string {
  const { token_hash, redirect_to, email_action_type } = emailData

  // Build the Supabase confirmation URL
  const baseUrl = Deno.env.get('SUPABASE_URL') || ''
  const confirmUrl = new URL(`${baseUrl}/auth/v1/verify`)
  confirmUrl.searchParams.set('token', token_hash)
  confirmUrl.searchParams.set('type', email_action_type)
  confirmUrl.searchParams.set('redirect_to', redirect_to || `${siteUrl}/company/login`)

  return confirmUrl.toString()
}

/**
 * Get email subject based on action type
 */
function getSubject(actionType: string): string {
  switch (actionType) {
    case 'signup':
      return 'Confirm Your Chester Business Scorecard Account'
    case 'invite':
      return 'You\'ve Been Invited to Chester Business Scorecard'
    case 'recovery':
      return 'Reset Your Chester Business Scorecard Password'
    case 'magiclink':
      return 'Your Chester Business Scorecard Login Link'
    case 'email_change':
      return 'Confirm Your Email Change'
    default:
      return 'Chester Business Scorecard'
  }
}

/**
 * Get email content based on action type
 */
function getEmailContent(actionType: string, confirmUrl: string): { heading: string; message: string; buttonText: string } {
  switch (actionType) {
    case 'signup':
      return {
        heading: 'Confirm Your Account',
        message: 'Thank you for signing up for Chester Business Scorecard. Please click the button below to confirm your email address and activate your account.',
        buttonText: 'Confirm Email',
      }
    case 'invite':
      return {
        heading: 'Set Up Your Account',
        message: 'You\'ve been invited to access the Chester Business Scorecard portal. Click the button below to set your password and complete your account setup.',
        buttonText: 'Set Your Password',
      }
    case 'recovery':
      return {
        heading: 'Reset Your Password',
        message: 'We received a request to reset your password for Chester Business Scorecard. Click the button below to choose a new password.',
        buttonText: 'Reset Password',
      }
    case 'magiclink':
      return {
        heading: 'Your Login Link',
        message: 'Click the button below to log in to your Chester Business Scorecard account.',
        buttonText: 'Log In',
      }
    case 'email_change':
      return {
        heading: 'Confirm Email Change',
        message: 'Please confirm your new email address by clicking the button below.',
        buttonText: 'Confirm Email',
      }
    default:
      return {
        heading: 'Chester Business Scorecard',
        message: 'Click the button below to continue.',
        buttonText: 'Continue',
      }
  }
}

/**
 * Build branded HTML email
 */
function buildEmailHtml(actionType: string, confirmUrl: string): string {
  const { heading, message, buttonText } = getEmailContent(actionType, confirmUrl)

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${heading}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #2563eb;">
            <h1 style="color: #1a1a1a; margin: 0; font-size: 24px; font-weight: 700;">Chester Business Scorecard</h1>
            <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Chester Brethren Business Group</p>
          </div>

          <!-- Content -->
          <h2 style="color: #1a1a1a; margin-top: 0; font-size: 20px;">${heading}</h2>
          <p style="font-size: 16px; color: #555; margin-bottom: 30px;">
            ${message}
          </p>

          <!-- Button -->
          <div style="text-align: center; margin: 40px 0;">
            <a href="${confirmUrl}" style="background-color: #2563eb; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">${buttonText}</a>
          </div>

          <!-- Security notice -->
          <p style="font-size: 14px; color: #888; margin-top: 30px;">
            This link will expire in 24 hours. If you didn't request this email, you can safely ignore it.
          </p>

          <!-- Login reminder -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="font-size: 14px; color: #666; margin: 0;">
              You can always access your account at:<br>
              <a href="${siteUrl}/company/login" style="color: #2563eb;">${siteUrl}/company/login</a>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            Chester Brethren Business Group<br>
            Supporting business excellence in our community
          </p>
        </div>
      </body>
    </html>
  `
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured')
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: 'Email service not configured' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!hookSecret) {
    console.error('SEND_EMAIL_HOOK_SECRET not configured')
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: 'Hook secret not configured' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)

  try {
    // Verify the webhook signature
    const wh = new Webhook(hookSecret)
    const { user, email_data } = wh.verify(payload, headers) as WebhookPayload

    console.log(`Processing ${email_data.email_action_type} email for ${user.email}`)

    // Build the confirmation URL
    const confirmUrl = buildConfirmationUrl(email_data)

    // Build the email
    const subject = getSubject(email_data.email_action_type)
    const html = buildEmailHtml(email_data.email_action_type, confirmUrl)

    // Send via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Chester Business Group <noreply@benchiva.com>',
        to: [user.email],
        subject,
        html,
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('Resend error:', errorText)
      return new Response(
        JSON.stringify({ error: { http_code: 500, message: 'Failed to send email' } }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const result = await emailResponse.json()
    console.log('Email sent successfully:', result.id)

    // Return empty success response as required by Supabase
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in send-email hook:', error)
    return new Response(
      JSON.stringify({
        error: {
          http_code: 401,
          message: error instanceof Error ? error.message : 'Webhook verification failed',
        },
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
