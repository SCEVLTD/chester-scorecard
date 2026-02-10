import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limiter.ts'
import { writeAuditLog, getClientIp } from '../_shared/audit.ts'

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
  aggregate: PortfolioAggregate
  isConsultant?: boolean
}

function buildPrompt(agg: PortfolioAggregate): string {
  return `<portfolio_overview>
Analysis Month: ${agg.analysisMonth}
Total Businesses: ${agg.totalBusinesses}
RAG Distribution: ${agg.distribution.green} Green, ${agg.distribution.amber} Amber, ${agg.distribution.red} Red
Average Score: ${agg.averageScore}/100
Score Range: ${agg.scoreRange.min} - ${agg.scoreRange.max}
</portfolio_overview>

<section_performance>
Weakest sections across portfolio (sorted by average score):
${agg.weakestSections.map(s =>
  `- ${s.section}: ${s.avgScore.toFixed(1)} (${s.percentOfMax.toFixed(0)}% of max), ${s.businessesBelow50Pct} businesses below 50%`
).join('\n')}
</section_performance>

<anomalies_flagged>
${agg.anomalies.length > 0
  ? agg.anomalies.map(a =>
      `- ${a.businessName}: ${a.scoreChange} points (now ${a.currentScore}, ${a.ragStatus.toUpperCase()})`
    ).join('\n')
  : 'No significant anomalies (>10 point drops) this month.'}
</anomalies_flagged>

<business_summaries>
${agg.businesses.map(b => `
${b.name} | Score: ${b.score}/100 (${b.rag.toUpperCase()}) | Trend: ${b.trend || 'N/A'}${b.trendChange ? ` (${b.trendChange > 0 ? '+' : ''}${b.trendChange})` : ''}
  Weakest: ${b.weakestSection}
  Risk: ${b.topRisk}
  Opportunity: ${b.topOpportunity}
`).join('\n')}
</business_summaries>`
}

function buildConsultantPrompt(agg: PortfolioAggregate): string {
  // Calculate qualitative distribution
  const totalCount = agg.totalBusinesses
  const healthyPct = Math.round((agg.distribution.green / totalCount) * 100)
  const concernPct = Math.round((agg.distribution.red / totalCount) * 100)
  const healthDescription = healthyPct >= 60 ? 'predominantly healthy'
    : concernPct >= 30 ? 'showing significant concern'
    : 'mixed health across the group'

  return `You are a SENIOR BUSINESS CONSULTANT preparing for a portfolio review meeting. Your role is to provide strategic insights that facilitate meaningful group discussion, NOT to report specific figures.

IMPORTANT RULES:
- DO NOT include specific pound values, percentages, or numeric scores in your output
- Focus on PATTERNS, THEMES, and STRATEGIC INSIGHTS across the portfolio
- Frame observations as discussion catalysts, not data reports
- Use language like "several businesses", "a notable pattern", "common theme"
- Adopt an advisory, coaching tone appropriate for peer group facilitation

Use UK English spelling throughout (e.g. analyse, prioritise, organisation).

<portfolio_context>
Analysis Month: ${agg.analysisMonth}
Portfolio Size: ${agg.totalBusinesses} businesses
Overall Health: ${healthDescription}
Performance Spread: ${agg.scoreRange.max - agg.scoreRange.min > 40 ? 'Wide variance in performance' : 'Relatively consistent performance'}
</portfolio_context>

<common_patterns>
Areas showing portfolio-wide weakness:
${agg.weakestSections.map(s =>
  `- ${s.section}: ${s.businessesBelow50Pct > totalCount / 2 ? 'Majority struggling' : s.businessesBelow50Pct > 0 ? 'Some businesses struggling' : 'Generally adequate'}`
).join('\n')}
</common_patterns>

<attention_signals>
${agg.anomalies.length > 0
  ? `${agg.anomalies.length} business${agg.anomalies.length > 1 ? 'es' : ''} showing significant movement this month`
  : 'No dramatic shifts this month - portfolio showing stability'}
</attention_signals>

<themes_from_businesses>
Common risks mentioned:
${[...new Set(agg.businesses.slice(0, 8).map(b => b.topRisk))].slice(0, 5).map(r => `- ${r}`).join('\n')}

Common opportunities identified:
${[...new Set(agg.businesses.slice(0, 8).map(b => b.topOpportunity))].slice(0, 5).map(o => `- ${o}`).join('\n')}
</themes_from_businesses>

Generate a consultant's portfolio briefing with:

1. **portfolioSummary** (150-200 words): Strategic narrative about portfolio health. NO specific figures or scores. Focus on the story - what patterns emerge, what deserves collective attention, what's encouraging.

2. **commonThemes** (3-5 items): Patterns observed across multiple businesses. Frame as "Several businesses are experiencing..." or "A common challenge appears to be..."

3. **attentionPriorities** (3-5 items): Each with businessName, reason (strategic framing, no figures), and urgency ("immediate", "soon", "monitor"). Focus on WHY they need attention, not their score.

4. **strategicRecommendations** (3-5 items): Portfolio-level advisory suggestions. Frame as group learning opportunities, peer support possibilities, or collective actions.

5. **discussionStarters** (3-5 items): Open questions to facilitate productive group conversation. "How are members handling...", "What's working for those who..."

Respond ONLY with valid JSON matching this structure.`
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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Rate limit check: 5 portfolio analyses per user per hour
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const rateLimitResult = await checkRateLimit(supabase, user.id, {
      action: 'generate_portfolio_analysis',
      maxRequests: 5,
      windowMinutes: 60,
    })

    if (!rateLimitResult.allowed) {
      return rateLimitResponse(getCorsHeaders(req), rateLimitResult.resetAt)
    }

    const { aggregate, isConsultant } = await req.json() as RequestBody

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
    })

    // Build appropriate prompt based on user role
    const prompt = isConsultant
      ? buildConsultantPrompt(aggregate)
      : buildPrompt(aggregate)

    // Standard admin system prompt with specific figures
    const standardSystemPrompt = `You are a senior business consultant analyzing a portfolio of ${aggregate.totalBusinesses} client businesses for a monthly review meeting. Respond ONLY with a valid JSON object, no other text.

The JSON must have exactly these fields:
- "portfolioSummary": string (150-250 word executive overview of portfolio health)
- "commonThemes": array of 3-5 strings (patterns across multiple businesses)
- "attentionPriorities": array of objects with "businessName" (string), "reason" (string), and "urgency" ("immediate", "soon", or "monitor")
- "strategicRecommendations": array of 3-5 strings (portfolio-level advice)
- "sectorInsights": array of strings (optional sector-specific insights, can be empty)

RULES:
- Only reference business names from the business_summaries section
- Base all claims on the data provided - do not invent metrics
- Urgency levels: immediate = needs action this week, soon = needs action this month, monitor = watch closely`

    // Consultant system prompt - strategic, no figures
    const consultantSystemPrompt = `You are a senior business consultant preparing strategic insights for a portfolio review meeting. Respond ONLY with a valid JSON object, no other text.

CRITICAL: DO NOT include specific pound values, percentages, or numeric scores anywhere in your output. Focus on qualitative insights and strategic patterns.

The JSON must have exactly these fields:
- "portfolioSummary": string (150-200 words - strategic narrative, NO specific figures)
- "commonThemes": array of 3-5 strings (patterns across multiple businesses, no numbers)
- "attentionPriorities": array of objects with "businessName" (string), "reason" (string - strategic framing, no scores), and "urgency" ("immediate", "soon", or "monitor")
- "strategicRecommendations": array of 3-5 strings (portfolio-level advisory suggestions)
- "discussionStarters": array of 3-5 strings (open questions for group facilitation)

RULES:
- NEVER mention specific scores, percentages, or pound figures
- Frame observations strategically: "showing momentum", "facing headwinds", "demonstrating resilience"
- Focus on patterns and themes, not individual metrics
- Urgency based on strategic concern, not score thresholds`

    const systemPrompt = isConsultant ? consultantSystemPrompt : standardSystemPrompt

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    })

    // Parse the structured output
    const textContent = response.content[0]
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    const analysis = extractJSON(textContent.text) as Record<string, unknown>

    // Add metadata
    analysis.generatedAt = new Date().toISOString()
    analysis.modelUsed = 'claude-sonnet-4-20250514'
    analysis.isConsultantView = isConsultant || false

    await writeAuditLog(supabase, {
      userId: user.id,
      userEmail: user.email || null,
      userRole: null,
      action: 'generate_portfolio_analysis',
      resourceType: 'portfolio',
      metadata: {
        businessCount: aggregate.totalBusinesses,
        month: aggregate.analysisMonth,
      },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get('user-agent'),
    })

    // Log token usage
    try {
      await writeAuditLog(supabase, {
        userId: user.id,
        userEmail: user.email || null,
        userRole: null,
        action: 'anthropic_api_usage',
        resourceType: 'ai_tokens',
        metadata: {
          function: 'generate-portfolio-analysis',
          model: 'claude-sonnet-4-20250514',
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        ipAddress: getClientIp(req),
        userAgent: req.headers.get('user-agent'),
      })
    } catch {
      // Token usage logging should never block the response
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error generating portfolio analysis:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to generate portfolio analysis',
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      }
    )
  }
})
