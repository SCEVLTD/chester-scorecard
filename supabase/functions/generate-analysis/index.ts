import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

interface RequestBody {
  scorecard: ScorecardData
  previousScorecard: ScorecardData | null
  businessName: string
}

function formatVariance(value: number | null): string {
  if (value === null) return 'N/A'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

function formatQualitative(value: string | null): string {
  if (!value) return 'Not rated'
  // Map the selection values to readable labels
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
    'differentiated': 'Market-leading, differentiated product',
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

function buildPrompt(
  scorecard: ScorecardData,
  previousScorecard: ScorecardData | null,
  businessName: string,
  submission: CompanySubmission | null
): string {
  return `You are a business performance advisor providing insights for a monthly business scorecard review.

BUSINESS: ${businessName}
MONTH: ${scorecard.month}
TYPE: Company Self-Assessment

OVERALL SCORE: ${scorecard.total_score}/100 (${scorecard.rag_status.toUpperCase()})

=== FINANCIAL PERFORMANCE (20 pts max) ===
Revenue vs Target: ${formatVariance(scorecard.revenue_variance)}
EBITDA vs Target: ${formatVariance(scorecard.net_profit_variance)}

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
1. Executive Summary (150-250 words): Synthesize the scorecard into a clear narrative. Reference specific numbers and ratings. Highlight what's going well and what needs attention. Write in second person ("Your business...") for self-assessment context. If the company provided insights about opportunities, risks, wins, or challenges, incorporate them into your analysis.

2. 5 Focus Points for Next Month: Key areas to monitor and improve based on this month's data. Each point should be specific, actionable, and grounded in the metrics. Focus on progress opportunities and areas needing attention.

3. 30-Day Action Items: Prioritized list of concrete actions. Each action must have a priority (high/medium/low). Focus on quick wins and urgent issues first.

4. Inconsistencies: Flag any contradictions between qualitative ratings and quantitative results using the detection rules above. If none found, return empty array.

5. Trend Breaks: If prior month data exists, note any significant changes (>10 point score change, RAG status change, major metric swings). If no prior data, return empty array.`
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { scorecard, previousScorecard, businessName } = await req.json() as RequestBody

    // Fetch company submission if available
    let submission: CompanySubmission | null = null
    if (scorecard.company_submission_id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseKey)

      const { data } = await supabase
        .from('company_submissions')
        .select('outbound_calls, first_orders, company_biggest_opportunity, company_biggest_risk, company_wins, company_challenges')
        .eq('id', scorecard.company_submission_id)
        .single()

      submission = data as CompanySubmission | null
    }

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
    })

    const prompt = buildPrompt(scorecard, previousScorecard, businessName, submission)

    const analysisTool = {
      name: 'submit_analysis',
      description: 'Submit the completed business analysis',
      input_schema: {
        type: 'object' as const,
        properties: {
          execSummary: { type: 'string', description: 'Executive summary (150-250 words)' },
          topQuestions: { type: 'array', items: { type: 'string' }, description: '5 focus points for next month - areas to monitor, improve, or track progress' },
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
            description: 'Prioritized 30-day action items'
          },
          inconsistencies: { type: 'array', items: { type: 'string' }, description: 'Data inconsistencies detected (empty array if none)' },
          trendBreaks: { type: 'array', items: { type: 'string' }, description: 'Significant trend breaks vs prior month (empty array if none or no prior data)' }
        },
        required: ['execSummary', 'topQuestions', 'actions30Day', 'inconsistencies', 'trendBreaks']
      }
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
      tools: [analysisTool],
      tool_choice: { type: 'tool', name: 'submit_analysis' }
    })

    // Extract the tool use result
    const toolUse = response.content.find(block => block.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('No tool use response from Claude')
    }

    const analysis = toolUse.input as Record<string, unknown>

    // Add metadata
    analysis.generatedAt = new Date().toISOString()
    analysis.modelUsed = 'claude-sonnet-4-5-20250929'

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error generating analysis:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to generate analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
