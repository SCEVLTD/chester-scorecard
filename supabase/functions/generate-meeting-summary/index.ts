import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PortfolioAggregate {
  totalBusinesses: number
  analysisMonth: string
  distribution: { green: number; amber: number; red: number }
  averageScore: number
  scoreRange: { min: number; max: number }
  weakestSections: {
    section: string
    avgScore: number
    percentOfMax: number
    businessesBelow50Pct: number
  }[]
  anomalies: {
    businessName: string
    scoreChange: number
    currentScore: number
    ragStatus: string
  }[]
  businesses: {
    name: string
    score: number
    rag: string
    trend: 'up' | 'down' | 'same' | null
    trendChange: number | null
    topRisk: string
    topOpportunity: string
    weakestSection: string
  }[]
}

interface RequestBody {
  aggregatedData: PortfolioAggregate
  persist?: boolean
  meetingDate?: string
  meetingType?: 'friday_group' | 'one_on_one' | 'quarterly_review' | 'ad_hoc'
  title?: string
  isConsultant?: boolean
}

function buildPrompt(agg: PortfolioAggregate): string {
  return `You are preparing a meeting summary for the Chester Brethren Business Group Friday meeting.

IMPORTANT: This summary must NOT identify individual businesses. Focus on patterns and themes across the portfolio.

<portfolio_data>
Analysis Month: ${agg.analysisMonth}
Total Businesses: ${agg.totalBusinesses}
RAG Distribution: ${agg.distribution.green} Green, ${agg.distribution.amber} Amber, ${agg.distribution.red} Red
Average Score: ${agg.averageScore}/100
Score Range: ${agg.scoreRange.min} - ${agg.scoreRange.max}

Weakest Sections (portfolio-wide):
${agg.weakestSections.map(s =>
  `- ${s.section}: ${s.avgScore.toFixed(1)} avg (${s.percentOfMax.toFixed(0)}% of max), ${s.businessesBelow50Pct} businesses below 50%`
).join('\n')}

Common Risks (anonymized):
${agg.businesses.slice(0, 10).map(b => `- ${b.topRisk}`).join('\n')}

Common Opportunities (anonymized):
${agg.businesses.slice(0, 10).map(b => `- ${b.topOpportunity}`).join('\n')}
</portfolio_data>

Generate a meeting prep summary with:

1. **aggregatedWins** (3-5 items): Common positive outcomes across multiple businesses. Use phrases like "Several businesses reported..." or "A majority of companies..."

2. **commonChallenges** (3-5 items): Shared difficulties. Never name specific businesses.

3. **discussionPoints** (5-7 items): Topics worth discussing as a group. Frame as "How are members handling..." or "What strategies work for..."

4. **groupActions** (3-5 items): Collective actions the group could take. Focus on peer learning opportunities.

5. **healthSummary** (2-3 sentences): Overall portfolio health assessment. Use aggregate stats only.

Respond ONLY with valid JSON matching this structure:
{
  "aggregatedWins": ["string", ...],
  "commonChallenges": ["string", ...],
  "discussionPoints": ["string", ...],
  "groupActions": ["string", ...],
  "healthSummary": "string",
  "generatedAt": "${new Date().toISOString()}",
  "modelUsed": "claude-sonnet-4-20250514"
}`
}

function buildConsultantPrompt(agg: PortfolioAggregate): string {
  // Calculate qualitative descriptions instead of raw numbers
  const totalCount = agg.totalBusinesses
  const healthyPct = Math.round((agg.distribution.green / totalCount) * 100)
  const portfolioHealth = healthyPct >= 70 ? 'strong overall health'
    : healthyPct >= 50 ? 'mixed health with room for improvement'
    : healthyPct >= 30 ? 'significant concerns across the group'
    : 'challenging period for the portfolio'

  return `You are preparing a meeting summary for the Chester Brethren Business Group Friday meeting.

CRITICAL RULES:
- This summary must NOT identify individual businesses
- DO NOT include specific scores, percentages, or pound figures in your output
- Focus on patterns, themes, and qualitative observations
- Use language like "several members", "a notable pattern", "the majority"
- Frame everything in a way appropriate for group discussion

Use UK English spelling throughout (e.g. analyse, prioritise, organisation).

<portfolio_context>
Analysis Month: ${agg.analysisMonth}
Group Size: ${agg.totalBusinesses} businesses
Portfolio Health: ${portfolioHealth}
</portfolio_context>

<common_themes>
Areas needing group attention:
${agg.weakestSections.map(s =>
  `- ${s.section}: ${s.businessesBelow50Pct > totalCount / 2 ? 'Widespread concern' : s.businessesBelow50Pct > 0 ? 'Some members struggling' : 'Generally adequate'}`
).join('\n')}

Common challenges mentioned:
${[...new Set(agg.businesses.slice(0, 10).map(b => b.topRisk))].slice(0, 5).map(r => `- ${r}`).join('\n')}

Common opportunities identified:
${[...new Set(agg.businesses.slice(0, 10).map(b => b.topOpportunity))].slice(0, 5).map(o => `- ${o}`).join('\n')}
</common_themes>

Generate a meeting prep summary with:

1. **aggregatedWins** (3-5 items): Common positive outcomes. NO specific figures. Use phrases like "Several members have seen improvement in..." or "Positive momentum in..."

2. **commonChallenges** (3-5 items): Shared difficulties. NO specific figures. Focus on themes not metrics.

3. **discussionPoints** (5-7 items): Topics for group discussion. Frame as "How are members handling..." or "What approaches are working for..."

4. **groupActions** (3-5 items): Collective actions the group could take. Focus on peer support and shared learning.

5. **healthSummary** (2-3 sentences): Qualitative portfolio assessment. NO specific scores or percentages. Describe the overall trajectory and mood.

Respond ONLY with valid JSON matching this structure:
{
  "aggregatedWins": ["string", ...],
  "commonChallenges": ["string", ...],
  "discussionPoints": ["string", ...],
  "groupActions": ["string", ...],
  "healthSummary": "string",
  "generatedAt": "${new Date().toISOString()}",
  "modelUsed": "claude-sonnet-4-20250514"
}`
}

function extractJSON(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text)
  } catch {
    // Continue to extraction methods
  }

  // Remove markdown code blocks
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }

  try {
    return JSON.parse(cleaned)
  } catch {
    // Continue to extraction methods
  }

  // Try to find JSON object in the text
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch {
      // Fall through to error
    }
  }

  throw new Error('Could not extract valid JSON from response')
}

function formatMeetingTitle(meetingDate: string, meetingType: string): string {
  const date = new Date(meetingDate)
  const formatted = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  switch (meetingType) {
    case 'friday_group':
      return `Chester Friday Meeting - ${formatted}`
    case 'quarterly_review':
      return `Quarterly Review - ${formatted}`
    case 'one_on_one':
      return `1:1 Meeting - ${formatted}`
    default:
      return `Meeting - ${formatted}`
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json() as RequestBody
    const { aggregatedData, persist, meetingDate, meetingType, title, isConsultant } = body

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
    })

    // Build appropriate prompt based on user role
    const prompt = isConsultant
      ? buildConsultantPrompt(aggregatedData)
      : buildPrompt(aggregatedData)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    // Parse the structured output
    const textContent = response.content[0]
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    const parsed = extractJSON(textContent.text) as Record<string, unknown>

    // Ensure metadata is present
    parsed.generatedAt = new Date().toISOString()
    parsed.modelUsed = 'claude-sonnet-4-20250514'
    parsed.isConsultantView = isConsultant || false

    // Persist to database if requested
    let meetingId: string | null = null

    if (persist) {
      // Get user email from JWT for created_by field
      const authHeader = req.headers.get('authorization')
      let userEmail = 'system'

      if (authHeader) {
        try {
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!
          const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
          const supabase = createClient(supabaseUrl, supabaseServiceKey)

          // Decode the JWT to get user info
          const token = authHeader.replace('Bearer ', '')
          const { data: { user } } = await supabase.auth.getUser(token)
          if (user?.email) {
            userEmail = user.email
          }
        } catch (e) {
          console.warn('Could not extract user email from token:', e)
        }
      }

      // Determine meeting date and type
      const effectiveDate = meetingDate || new Date().toISOString().split('T')[0]
      const effectiveType = meetingType || 'friday_group'
      const effectiveTitle = title || formatMeetingTitle(effectiveDate, effectiveType)

      // Insert into meetings table
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const { data: meeting, error: insertError } = await supabase
        .from('meetings')
        .insert({
          title: effectiveTitle,
          meeting_date: effectiveDate,
          meeting_type: effectiveType,
          status: 'draft',
          portfolio_snapshot: aggregatedData,
          businesses_count: aggregatedData.totalBusinesses,
          month_analyzed: aggregatedData.analysisMonth,
          ai_summary: parsed,
          model_used: 'claude-sonnet-4-20250514',
          created_by: userEmail,
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('Failed to persist meeting:', insertError)
        // Don't fail the whole request, just log the error
      } else {
        meetingId = meeting.id
      }
    }

    // Return response with optional meetingId
    const result = {
      ...parsed,
      ...(meetingId && { meetingId }),
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error generating meeting summary:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to generate meeting summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
