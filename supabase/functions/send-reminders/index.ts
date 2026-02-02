import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PendingSubmission {
  business_id: string
  business_name: string
  user_email: string
  month: string
}

interface SendEmailResult {
  business_id: string
  business_name: string
  status: number
  ok: boolean
  error?: string
}

async function sendReminderEmail(
  resendApiKey: string,
  submission: PendingSubmission
): Promise<SendEmailResult> {
  const submissionUrl = `https://chester-scorecard.vercel.app/company/${submission.business_id}/submit`

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h2 style="color: #1a1a1a; margin-top: 0;">Monthly Data Submission Reminder</h2>
          <p style="font-size: 16px; color: #555;">Hello,</p>
          <p style="font-size: 16px; color: #555;">
            This is a friendly reminder that your monthly business data for <strong>${submission.month}</strong> has not yet been submitted to the Chester Business Group scorecard.
          </p>
          <p style="font-size: 16px; color: #555;">
            Please take a few minutes to submit your data so we can continue tracking your business progress.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${submissionUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">Submit Your Data</a>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            If you have any questions or need assistance, please contact your group administrator.
          </p>
        </div>
        <div style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
          <p>Chester Brethren Business Group</p>
          <p>Doing good by doing well</p>
        </div>
      </body>
    </html>
  `

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Chester Business Group <noreply@velocitygrowth.co.uk>',
        to: submission.user_email,
        subject: `Monthly Data Submission Reminder - ${submission.month}`,
        html: emailHtml,
      }),
    })

    return {
      business_id: submission.business_id,
      business_name: submission.business_name,
      status: response.status,
      ok: response.ok,
    }
  } catch (error) {
    return {
      business_id: submission.business_id,
      business_name: submission.business_name,
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

    // Call database function to get pending submissions
    const { data: pendingSubmissions, error: dbError } = await supabase
      .rpc('get_pending_submissions', { target_month: targetMonth })

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`)
    }

    if (!pendingSubmissions || pendingSubmissions.length === 0) {
      return new Response(
        JSON.stringify({
          sent: 0,
          message: `No pending submissions for ${targetMonth}`,
          results: [],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Send reminder emails
    const results: SendEmailResult[] = []
    for (const submission of pendingSubmissions as PendingSubmission[]) {
      const result = await sendReminderEmail(resendApiKey, submission)
      results.push(result)
    }

    const successCount = results.filter(r => r.ok).length

    return new Response(
      JSON.stringify({
        sent: successCount,
        total: results.length,
        month: targetMonth,
        results: results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error sending reminder emails:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to send reminder emails',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
