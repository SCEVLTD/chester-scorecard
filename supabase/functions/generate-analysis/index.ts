import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limiter.ts'
import { writeAuditLog, getClientIp } from '../_shared/audit.ts'

interface ScorecardData {
  month: string
  company_submission_id: string | null
  revenue_variance: number | null
  net_profit_variance: number | null
  leadership: string | null
  market_demand: string | null
  marketing: string | null
  product_strength: string | null
  supplier_strength: string | null
  sales_execution: string | null
  total_score: number
  rag_status: string
}

interface CompanySubmission {
  outbound_calls: number | null
  first_orders: number | null
  company_biggest_opportunity: string | null
  company_biggest_risk: string | null
  company_wins: string | null
  company_challenges: string | null
}

interface HistoricalDataPoint {
  month: string
  revenue_actual: number | null
  revenue_target: number | null
  ebitda_actual: number | null
  ebitda_target: number | null
}

interface RequestBody {
  scorecard: ScorecardData
  previousScorecard: ScorecardData | null
  businessName: string
  eProfile?: string | null
  historicalData?: HistoricalDataPoint[]
  generateBoth?: boolean  // NEW: Generate both standard and consultant versions
  isConsultant?: boolean  // LEGACY: For backwards compatibility
}

function formatVariance(value: number | null): string {
  if (value === null) return 'N/A'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

function formatQualitative(value: string | null): string {
  if (!value) return 'Not rated'
  const labels: Record<string, string> = {
    // Leadership
    'aligned': 'Fully aligned, accountable leadership',
    'minor_issues': 'Minor issues, not performance limiting',
    'misaligned': 'Clear misalignment affecting output',
    'toxic': 'Toxic / blocking progress',
    'na': 'N/A',
    // Market demand
    'strong': 'Strong demand / positive momentum',
    'flat': 'Flat / mixed signals',
    'softening': 'Softening / pressure on pricing',
    'declining': 'Declining / losing share',
    // Marketing
    'generating': 'Consistently generating quality leads',
    'some_results': 'Some results, room for improvement',
    'minimal': 'Minimal impact on pipeline',
    'none': 'No marketing activity',
    // Product
    'differentiated': 'Market leading, differentiated product',
    'competitive': 'Competitive, meets market needs',
    'catching_up': 'Falling behind, catching up',
    'commodity': 'Commodity, no differentiation',
    // Suppliers
    'strategic': 'Strategic partnerships, preferential terms',
    'reliable': 'Reliable supply, good relationships',
    'adequate': 'Adequate but nothing special',
    'problematic': 'Problematic, supply issues',
    // Sales
    'exceeding': 'Exceeding targets, strong pipeline',
    'on_track': 'On track, consistent execution',
    'underperforming': 'Underperforming, pipeline concerns',
    'no_engine': 'No effective sales engine',
  }
  return labels[value] || value
}

const E_PROFILE_LABELS: Record<string, string> = {
  E0: 'Entry (<GBP 0.5m annual revenue)',
  E1: 'Emerging (GBP 0.5m-1.5m)',
  E2: 'Expansion (GBP 1.5m-5m)',
  E3: 'Elevation (GBP 5m-11m)',
  E4: 'Established (GBP 11m-20m)',
  E5: 'Enterprise (GBP 20m+)',
}

function formatHistoricalData(data: HistoricalDataPoint[] | undefined): string {
  if (!data || data.length === 0) return 'No historical data available'

  const lines: string[] = []
  let ytdRevActual = 0
  let ytdRevTarget = 0
  let ytdEbitdaActual = 0
  let ytdEbitdaTarget = 0

  const currentYear = new Date().getFullYear().toString()

  data.forEach((d) => {
    const revVariance = d.revenue_target && d.revenue_target > 0
      ? ((d.revenue_actual || 0) - d.revenue_target) / d.revenue_target * 100
      : null
    const ebitdaVariance = d.ebitda_target && d.ebitda_target > 0
      ? ((d.ebitda_actual || 0) - d.ebitda_target) / d.ebitda_target * 100
      : null

    lines.push(`${d.month}: Revenue GBP ${(d.revenue_actual || 0).toLocaleString()} vs GBP ${(d.revenue_target || 0).toLocaleString()} target (${revVariance !== null ? formatVariance(revVariance) : 'N/A'}) | EBITDA GBP ${(d.ebitda_actual || 0).toLocaleString()} (${ebitdaVariance !== null ? formatVariance(ebitdaVariance) : 'N/A'})`)

    if (d.month.startsWith(currentYear)) {
      ytdRevActual += d.revenue_actual || 0
      ytdRevTarget += d.revenue_target || 0
      ytdEbitdaActual += d.ebitda_actual || 0
      ytdEbitdaTarget += d.ebitda_target || 0
    }
  })

  const ytdRevVariance = ytdRevTarget > 0
    ? ((ytdRevActual - ytdRevTarget) / ytdRevTarget * 100)
    : null
  const ytdEbitdaPct = ytdRevActual > 0
    ? (ytdEbitdaActual / ytdRevActual * 100)
    : null

  lines.push('')
  lines.push(`YTD ${currentYear}: Revenue GBP ${ytdRevActual.toLocaleString()} vs GBP ${ytdRevTarget.toLocaleString()} target (${ytdRevVariance !== null ? formatVariance(ytdRevVariance) : 'N/A'}) | EBITDA GBP ${ytdEbitdaActual.toLocaleString()} (${ytdEbitdaPct !== null ? ytdEbitdaPct.toFixed(1) : 'N/A'}% margin)`)

  return lines.join('\n')
}

function buildConsultantPrompt(
  scorecard: ScorecardData,
  previousScorecard: ScorecardData | null,
  businessName: string,
  submission: CompanySubmission | null,
  eProfile?: string | null,
  _historicalData?: HistoricalDataPoint[]
): string {
  const eProfileSection = eProfile
    ? `E-PROFILE: ${eProfile} - ${E_PROFILE_LABELS[eProfile] || 'Unknown category'}\n`
    : ''

  const revenueTrend = scorecard.revenue_variance !== null
    ? scorecard.revenue_variance > 5 ? 'above target'
      : scorecard.revenue_variance < -5 ? 'below target'
      : 'near target'
    : 'not reported'

  const profitTrend = scorecard.net_profit_variance !== null
    ? scorecard.net_profit_variance > 5 ? 'above target'
      : scorecard.net_profit_variance < -5 ? 'below target'
      : 'near target'
    : 'not reported'

  return `You are a SENIOR BUSINESS CONSULTANT preparing for a one-on-one advisory meeting with a client business owner. Your role is to provide strategic insights and facilitate productive conversation, NOT to report specific financial figures.

IMPORTANT RULES:
- DO NOT include specific pound values, percentages, or numeric figures in your output
- Focus on PATTERNS, TRENDS, and STRATEGIC INSIGHTS
- Frame observations as conversation starters and strategic questions
- Adopt an advisory, coaching tone - not a reporting tone
- Use language like "appears to be", "suggests", "indicates" rather than exact figures

Use UK English spelling throughout (e.g. analyse, prioritise, organisation).

BUSINESS: ${businessName}
MONTH: ${scorecard.month}
${eProfileSection}
OVERALL HEALTH: ${scorecard.rag_status.toUpperCase()} status (${scorecard.total_score >= 70 ? 'Strong' : scorecard.total_score >= 40 ? 'Moderate' : 'Needs attention'})

=== PERFORMANCE INDICATORS (Qualitative) ===
Revenue Performance: ${revenueTrend}
Profitability Performance: ${profitTrend}

=== LEAD INDICATORS ===
Sales Activity Level: ${submission?.outbound_calls !== null ? (submission.outbound_calls > 50 ? 'High' : submission.outbound_calls > 20 ? 'Moderate' : 'Low') : 'Not tracked'}
New Business Generation: ${submission?.first_orders !== null ? (submission.first_orders > 5 ? 'Strong' : submission.first_orders > 2 ? 'Steady' : 'Light') : 'Not tracked'}

=== QUALITATIVE ASSESSMENTS ===
Leadership/Alignment: ${formatQualitative(scorecard.leadership)}
Market Demand: ${formatQualitative(scorecard.market_demand)}
Marketing Effectiveness: ${formatQualitative(scorecard.marketing)}
Product Strength: ${formatQualitative(scorecard.product_strength)}
Supplier Strength: ${formatQualitative(scorecard.supplier_strength)}
Sales Execution: ${formatQualitative(scorecard.sales_execution)}

=== CLIENT'S OWN PERSPECTIVE ===
They see their biggest opportunity as: ${submission?.company_biggest_opportunity || 'Not shared'}
They see their biggest risk as: ${submission?.company_biggest_risk || 'Not shared'}
Recent wins they've highlighted: ${submission?.company_wins || 'Not shared'}
Challenges they're facing: ${submission?.company_challenges || 'Not shared'}

${previousScorecard ? `
=== MONTH-ON-MONTH MOVEMENT ===
Trend: ${scorecard.total_score > previousScorecard.total_score ? 'Improving' : scorecard.total_score < previousScorecard.total_score ? 'Declining' : 'Stable'}
Momentum: ${Math.abs(scorecard.total_score - previousScorecard.total_score) > 10 ? 'Significant shift' : 'Gradual change'}
` : '=== MONTH-ON-MONTH MOVEMENT ===\nFirst month of tracking - establishing baseline'}

---

REQUIRED OUTPUT (Consultant Advisory Format):

1. Executive Summary (150-200 words): Synthesise the business health into a strategic narrative. DO NOT quote specific figures. Focus on the story - what's working, what's concerning, what deserves attention. Write as a senior consultant briefing themselves before a client meeting.

2. Key Observations (5 items): Strategic insights about the business. Frame as observations that lead to meaningful conversation. Examples: "Leadership alignment appears healthy, suggesting clear strategic direction" or "Sales activity doesn't match the reported execution quality - worth exploring".

3. Discussion Points for Meeting (5 items): Open-ended questions to facilitate productive dialogue. Frame as "What's driving...", "How is the team feeling about...", "Are there opportunities to...". These should prompt reflection, not defensive responses.

4. Strategic Recommendations (3-5 items): Advisory suggestions framed as "Consider...", "Explore...", "Review whether...". Each should have a priority (high/medium/low). Focus on strategic moves, not operational fixes.

5. Red Flags (0-3 items): Only include if data suggests genuine concern. Frame diplomatically but clearly. If none evident, return empty array.

6. Relationship Context: One brief note on how the client seems to view their business (optimistic, concerned, realistic) based on their self-reported insights vs actual performance indicators.`
}

function buildStandardPrompt(
  scorecard: ScorecardData,
  previousScorecard: ScorecardData | null,
  businessName: string,
  submission: CompanySubmission | null,
  eProfile?: string | null,
  historicalData?: HistoricalDataPoint[]
): string {
  const eProfileSection = eProfile
    ? `E-PROFILE: ${eProfile} - ${E_PROFILE_LABELS[eProfile] || 'Unknown category'}\n`
    : ''

  const historicalSection = historicalData && historicalData.length > 0
    ? `\n=== HISTORICAL PERFORMANCE (Last ${historicalData.length} months) ===\n${formatHistoricalData(historicalData)}\n`
    : ''

  return `You are a business performance adviser providing insights for a monthly business scorecard review. Use UK English spelling throughout (e.g. analyse, prioritise, organisation).

BUSINESS: ${businessName}
MONTH: ${scorecard.month}
TYPE: Company Self Assessment
${eProfileSection}
OVERALL SCORE: ${scorecard.total_score}/100 (${scorecard.rag_status.toUpperCase()})

=== FINANCIAL PERFORMANCE (20 pts max) ===
Revenue vs Target: ${formatVariance(scorecard.revenue_variance)}
EBITDA vs Target: ${formatVariance(scorecard.net_profit_variance)}
${historicalSection}

=== LEAD KPIs ===
Outbound Calls: ${submission?.outbound_calls ?? 'Not reported'}
First Orders: ${submission?.first_orders ?? 'Not reported'}

=== QUALITATIVE ASSESSMENTS ===
Leadership/Alignment: ${formatQualitative(scorecard.leadership)}
Market Demand: ${formatQualitative(scorecard.market_demand)}
Marketing Effectiveness: ${formatQualitative(scorecard.marketing)}
Product Strength: ${formatQualitative(scorecard.product_strength)}
Supplier Strength: ${formatQualitative(scorecard.supplier_strength)}
Sales Execution: ${formatQualitative(scorecard.sales_execution)}

=== COMPANY INSIGHTS ===
Biggest Opportunity: ${submission?.company_biggest_opportunity || 'Not provided'}
Biggest Risk: ${submission?.company_biggest_risk || 'Not provided'}
Recent Wins: ${submission?.company_wins || 'Not provided'}
Current Challenges: ${submission?.company_challenges || 'Not provided'}

${previousScorecard ? `
=== PREVIOUS MONTH (${previousScorecard.month}) ===
Previous Score: ${previousScorecard.total_score}/100 (${previousScorecard.rag_status.toUpperCase()})
Score Change: ${scorecard.total_score - previousScorecard.total_score} points
` : '=== PREVIOUS MONTH ===\nNo prior month data available'}

---

INCONSISTENCY DETECTION:
Flag these specific contradictions if present:
1. Strong market_demand BUT negative revenue_variance - Note: "Strong market demand reported, yet revenue is below target. Consider what's blocking conversion."
2. Strong sales_execution BUT low lead KPIs (few calls/orders) - Note: "Sales execution rated highly but lead activity is low. Team may need to increase prospecting."
3. High leadership rating BUT poor financial performance (negative variances) - Note: "Leadership rated confident despite financial headwinds. Review the basis for optimism."
4. Product rated as differentiated BUT revenue declining - Note: "Product rated strong but revenue under pressure. May indicate market positioning issue."
5. Strong marketing rating BUT low first orders - Note: "Marketing rated effective but first orders are low. Review lead quality and conversion."

Only include an inconsistency if the data clearly shows the contradiction. Be specific about which data points conflict.

---

REQUIRED OUTPUT:
1. Executive Summary (150 to 250 words): Synthesize the scorecard into a clear narrative. Reference specific numbers and ratings. Highlight what's going well and what needs attention. Write in second person ("Your business...") for self assessment context. If the company provided insights about opportunities, risks, wins, or challenges, incorporate them into your analysis.

2. 5 Focus Points for Next Month: Key areas to monitor and improve based on this month's data. Each point should be specific, actionable, and grounded in the metrics. Focus on progress opportunities and areas needing attention.

3. 30 Day Action Items: Prioritised list of concrete actions. Each action must have a priority (high/medium/low). Focus on quick wins and urgent issues first.

4. Inconsistencies: Flag any contradictions between qualitative ratings and quantitative results using the detection rules above. If none found, return empty array.

5. Trend Breaks: If prior month data exists, note any significant changes (more than 10 point score change, RAG status change, major metric swings). If no prior data, return empty array.

6. Historical Context: If historical data is provided, assess the trajectory. Is revenue trending up, flat, or down? Is EBITDA margin improving? How does YTD compare to target? Provide a brief assessment (2-3 sentences). Empty string if no historical data.

7. E-Profile Considerations: If an E-Profile is provided, note any size-appropriate considerations. E0/E1 businesses may have different priorities than E4/E5. Comment on whether the business appears to be operating appropriately for its scale. Empty string if no E-Profile provided.`
}

// Tool schemas
const standardAnalysisTool = {
  name: 'submit_analysis',
  description: 'Submit the completed business analysis',
  input_schema: {
    type: 'object' as const,
    properties: {
      execSummary: { type: 'string', description: 'Executive summary (150 to 250 words)' },
      topQuestions: { type: 'array', items: { type: 'string' }, description: '5 focus points for next month' },
      actions30Day: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            action: { type: 'string' },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] }
          },
          required: ['action', 'priority']
        },
        description: 'Prioritised 30 day action items'
      },
      inconsistencies: { type: 'array', items: { type: 'string' }, description: 'Data inconsistencies detected (empty array if none)' },
      trendBreaks: { type: 'array', items: { type: 'string' }, description: 'Significant trend breaks vs prior month (empty array if none)' },
      historicalContext: { type: 'string', description: 'Brief assessment of historical trajectory. Empty string if no data.' },
      eProfileConsiderations: { type: 'string', description: 'Size-appropriate considerations. Empty string if no E-Profile.' }
    },
    required: ['execSummary', 'topQuestions', 'actions30Day', 'inconsistencies', 'trendBreaks', 'historicalContext', 'eProfileConsiderations']
  }
}

const consultantAnalysisTool = {
  name: 'submit_analysis',
  description: 'Submit the consultant executive summary',
  input_schema: {
    type: 'object' as const,
    properties: {
      execSummary: { type: 'string', description: 'Executive summary (150-200 words) - strategic narrative, no specific figures' },
      keyObservations: { type: 'array', items: { type: 'string' }, description: '5 strategic observations about the business' },
      discussionPoints: { type: 'array', items: { type: 'string' }, description: '5 open-ended questions for meeting dialogue' },
      strategicRecommendations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            recommendation: { type: 'string' },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] }
          },
          required: ['recommendation', 'priority']
        },
        description: '3-5 strategic recommendations with priority levels'
      },
      redFlags: { type: 'array', items: { type: 'string' }, description: '0-3 items of genuine concern (empty array if none)' },
      relationshipContext: { type: 'string', description: 'Brief note on how client views their business' }
    },
    required: ['execSummary', 'keyObservations', 'discussionPoints', 'strategicRecommendations', 'redFlags', 'relationshipContext']
  }
}

interface AnalysisResult {
  data: Record<string, unknown>
  usage: { input_tokens: number; output_tokens: number }
}

async function generateSingleAnalysis(
  anthropic: Anthropic,
  prompt: string,
  tool: typeof standardAnalysisTool | typeof consultantAnalysisTool
): Promise<AnalysisResult> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
    tools: [tool],
    tool_choice: { type: 'tool', name: 'submit_analysis' }
  })

  const toolUse = response.content.find(block => block.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('No tool use response from Claude')
  }

  return {
    data: toolUse.input as Record<string, unknown>,
    usage: response.usage,
  }
}

Deno.serve(async (req) => {
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

    const { scorecard, previousScorecard, businessName, eProfile, historicalData, generateBoth, isConsultant } = await req.json() as RequestBody

    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Rate limit check: 10 AI generations per user per hour
    const rateLimitResult = await checkRateLimit(supabase, user.id, {
      action: 'generate_analysis',
      maxRequests: 10,
      windowMinutes: 60,
    })

    if (!rateLimitResult.allowed) {
      return rateLimitResponse(getCorsHeaders(req), rateLimitResult.resetAt)
    }

    // Fetch company submission if available
    let submission: CompanySubmission | null = null
    if (scorecard.company_submission_id) {
      const { data } = await supabase
        .from('company_submissions')
        .select('outbound_calls, first_orders, company_biggest_opportunity, company_biggest_risk, company_wins, company_challenges')
        .eq('id', scorecard.company_submission_id)
        .single()

      submission = data as CompanySubmission | null
    }

    // Fetch historical data if not provided
    let fetchedHistoricalData = historicalData
    if (!fetchedHistoricalData && scorecard.company_submission_id) {
      const { data: dataRequest } = await supabase
        .from('company_submissions')
        .select('data_requests!inner(business_id)')
        .eq('id', scorecard.company_submission_id)
        .single()

      if (dataRequest) {
        const businessId = (dataRequest.data_requests as { business_id: string }).business_id

        const { data: history } = await supabase
          .from('company_submissions')
          .select(`
            revenue_actual,
            revenue_target,
            net_profit_actual,
            net_profit_target,
            data_requests!inner(month, business_id)
          `)
          .eq('data_requests.business_id', businessId)
          .order('data_requests(month)', { ascending: false })
          .limit(12)

        if (history) {
          fetchedHistoricalData = history.map((h) => ({
            month: (h.data_requests as { month: string }).month,
            revenue_actual: h.revenue_actual,
            revenue_target: h.revenue_target,
            ebitda_actual: h.net_profit_actual,
            ebitda_target: h.net_profit_target,
          })).reverse()
        }
      }
    }

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
    })

    const generatedAt = new Date().toISOString()
    const modelUsed = 'claude-sonnet-4-5-20250929'

    // NEW: Generate both versions in parallel
    if (generateBoth) {
      const standardPrompt = buildStandardPrompt(scorecard, previousScorecard, businessName, submission, eProfile, fetchedHistoricalData)
      const consultantPrompt = buildConsultantPrompt(scorecard, previousScorecard, businessName, submission, eProfile, fetchedHistoricalData)

      // Run both in parallel
      const [standardResult, consultantResult] = await Promise.all([
        generateSingleAnalysis(anthropic, standardPrompt, standardAnalysisTool),
        generateSingleAnalysis(anthropic, consultantPrompt, consultantAnalysisTool),
      ])

      // Return combined format
      const combinedAnalysis = {
        standard: standardResult.data,
        consultant: consultantResult.data,
        generatedAt,
        modelUsed,
      }

      await writeAuditLog(supabase, {
        userId: user.id,
        userEmail: user.email || null,
        userRole: null,
        action: 'generate_analysis',
        resourceType: 'scorecard',
        resourceId: scorecard.company_submission_id,
        metadata: {
          businessName,
          month: scorecard.month,
          generateBoth: true,
        },
        ipAddress: getClientIp(req),
        userAgent: req.headers.get('user-agent'),
      })

      // Log combined token usage from both API calls
      const totalInputTokens = standardResult.usage.input_tokens + consultantResult.usage.input_tokens
      const totalOutputTokens = standardResult.usage.output_tokens + consultantResult.usage.output_tokens
      try {
        await writeAuditLog(supabase, {
          userId: user.id,
          userEmail: user.email || null,
          userRole: null,
          action: 'anthropic_api_usage',
          resourceType: 'ai_tokens',
          metadata: {
            function: 'generate-analysis',
            model: modelUsed,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            totalTokens: totalInputTokens + totalOutputTokens,
            callCount: 2,
          },
          ipAddress: getClientIp(req),
          userAgent: req.headers.get('user-agent'),
        })
      } catch {
        // Token usage logging should never block the response
      }

      return new Response(JSON.stringify(combinedAnalysis), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // LEGACY: Single version generation (for backwards compatibility)
    const prompt = isConsultant
      ? buildConsultantPrompt(scorecard, previousScorecard, businessName, submission, eProfile, fetchedHistoricalData)
      : buildStandardPrompt(scorecard, previousScorecard, businessName, submission, eProfile, fetchedHistoricalData)

    const analysisTool = isConsultant ? consultantAnalysisTool : standardAnalysisTool
    const result = await generateSingleAnalysis(anthropic, prompt, analysisTool)

    // Add metadata
    const analysis = result.data
    analysis.generatedAt = generatedAt
    analysis.modelUsed = modelUsed
    analysis.isConsultantView = isConsultant || false

    await writeAuditLog(supabase, {
      userId: user.id,
      userEmail: user.email || null,
      userRole: null,
      action: 'generate_analysis',
      resourceType: 'scorecard',
      resourceId: scorecard.company_submission_id,
      metadata: {
        businessName,
        month: scorecard.month,
        generateBoth: false,
        isConsultant: isConsultant || false,
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
          function: 'generate-analysis',
          model: modelUsed,
          inputTokens: result.usage.input_tokens,
          outputTokens: result.usage.output_tokens,
          totalTokens: result.usage.input_tokens + result.usage.output_tokens,
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
    console.error('Error generating analysis:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to generate analysis',
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      }
    )
  }
})
