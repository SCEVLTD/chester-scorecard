import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BusinessWithEmail {
  id: string
  name: string
  emails: Array<{ email: string; is_primary: boolean }>
}

interface SendEmailResult {
  business_id: string
  business_name: string
  status: number
  ok: boolean
  error?: string
}

/**
 * Generate a secure random token for magic links
 * Uses crypto.getRandomValues for 256-bit entropy
 */
function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Calculate expiry date (30 days from now for invitations)
 */
function calculateExpiry(days: number = 30): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

/**
 * Build invitation email HTML
 */
function buildInvitationHtml(businessName: string, magicLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h2 style="color: #1a1a1a; margin-top: 0;">Welcome to Chester Business Scorecard</h2>
          <p style="font-size: 16px; color: #555;">Hello ${businessName},</p>
          <p style="font-size: 16px; color: #555;">
            You're invited to participate in the Chester Business Group's monthly scorecard system.
            This tool helps track your business performance and provides valuable insights through comparison
            with other businesses in the group.
          </p>
          <p style="font-size: 16px; color: #555;">
            <strong>How it works:</strong>
          </p>
          <ul style="font-size: 16px; color: #555; line-height: 1.8;">
            <li>Submit your monthly business data using the secure link below</li>
            <li>Receive your personalized scorecard with actionable insights</li>
            <li>See how your business compares with anonymized group averages</li>
            <li>Track your progress over time</li>
          </ul>
          <p style="font-size: 16px; color: #555;">
            Your unique submission link is valid for <strong>30 days</strong>. Please submit your data by the deadline
            to ensure your scorecard is generated on time.
          </p>
          <div style="text-align: center; margin: 40px 0;">
            <a href="${magicLink}" style="background-color: #2563eb; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 18px;">Submit Your Data</a>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            This is a secure, personalized link for ${businessName}. If you have any questions or need assistance,
            please contact your group administrator.
          </p>
        </div>
        <div style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
          <p>Chester Brethren Business Group</p>
          <p>Doing good by doing well</p>
        </div>
      </body>
    </html>
  `
}

/**
 * Send invitation email using Resend API
 */
async function sendInvitationEmail(
  resendApiKey: string,
  business: BusinessWithEmail,
  primaryEmail: string,
  magicLink: string
): Promise<SendEmailResult> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Chester Business Group <noreply@benchiva.com>',
        to: primaryEmail,
        subject: 'Your Business Scorecard - Submit Your Data',
        html: buildInvitationHtml(business.name, magicLink),
      }),
    })

    return {
      business_id: business.id,
      business_name: business.name,
      status: response.status,
      ok: response.ok,
    }
  } catch (error) {
    return {
      business_id: business.id,
      business_name: business.name,
      status: 500,
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check for required environment variables
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable not set')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase environment variables not set')
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Calculate current month as YYYY-MM
    const now = new Date()
    const targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Get all businesses with their emails
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select(`
        id,
        name,
        company_emails!inner(email, is_primary)
      `)

    if (businessError) {
      throw new Error(`Database error fetching businesses: ${businessError.message}`)
    }

    if (!businesses || businesses.length === 0) {
      return new Response(
        JSON.stringify({
          sent: 0,
          total: 0,
          message: 'No businesses found',
          results: [],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Process each business
    const results: SendEmailResult[] = []
    const errors: string[] = []

    for (const business of businesses as BusinessWithEmail[]) {
      // Get primary email or fall back to first email
      const primaryEmail = business.emails.find(e => e.is_primary)?.email || business.emails[0]?.email

      if (!primaryEmail) {
        errors.push(`${business.name}: No email address configured`)
        results.push({
          business_id: business.id,
          business_name: business.name,
          status: 400,
          ok: false,
          error: 'No email address configured',
        })
        continue
      }

      // Check if data_request already exists for this month
      const { data: existingRequest } = await supabase
        .from('data_requests')
        .select('id')
        .eq('business_id', business.id)
        .eq('month', targetMonth)
        .maybeSingle()

      let token: string
      let requestId: string

      if (existingRequest) {
        // Data request already exists, use existing one
        requestId = existingRequest.id
        // Fetch the existing token
        const { data: existingData } = await supabase
          .from('data_requests')
          .select('token')
          .eq('id', requestId)
          .single()
        token = existingData?.token || ''
      } else {
        // Create new data_request with 30-day expiry
        token = generateToken()
        const expiresAt = calculateExpiry(30)

        const { data: newRequest, error: requestError } = await supabase
          .from('data_requests')
          .insert({
            business_id: business.id,
            month: targetMonth,
            token,
            expires_at: expiresAt,
            status: 'pending',
          })
          .select('id')
          .single()

        if (requestError) {
          errors.push(`${business.name}: Failed to create data request - ${requestError.message}`)
          results.push({
            business_id: business.id,
            business_name: business.name,
            status: 500,
            ok: false,
            error: `Failed to create data request: ${requestError.message}`,
          })
          continue
        }

        requestId = newRequest.id
      }

      // Build magic link
      const magicLink = `https://chester.benchiva.com/submit/${token}`

      // Send email
      const emailResult = await sendInvitationEmail(resendApiKey, business, primaryEmail, magicLink)
      results.push(emailResult)
    }

    const successCount = results.filter(r => r.ok).length

    return new Response(
      JSON.stringify({
        sent: successCount,
        total: businesses.length,
        month: targetMonth,
        results: results,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error sending invitation emails:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to send invitation emails',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
