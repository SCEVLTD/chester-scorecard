import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScorecardData {
  month: string
  consultant_name: string
  revenue_variance: number | null
  gross_profit_variance: number | null
  overheads_variance: number | null
  net_profit_variance: number | null
  productivity_benchmark: number | null
  productivity_actual: number | null
  leadership: string | null
  market_demand: string | null
  marketing: string | null
  product_strength: string | null
  supplier_strength: string | null
  sales_execution: string | null
  biggest_opportunity: string
  biggest_risk: string
  management_avoiding: string
  leadership_confidence: string
  consultant_gut_feel: string
  total_score: number
  rag_status: string
}

interface RequestBody {
  scorecard: ScorecardData
  previousScorecard: ScorecardData | null
  businessName: string
}

function formatVariance(value: number | null): string {
  if (value === null) return 'N/A'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value}%`
}

function formatQualitative(value: string | null): string {
  if (value === null) return 'Not rated'
  const labels: Record<string, string> = {
    '1': '1 - Very Poor',
    '2': '2 - Poor',
    '3': '3 - Average',
    '4': '4 - Good',
    '5': '5 - Excellent',
  }
  return labels[value] || value
}

function buildPrompt(
  scorecard: ScorecardData,
  previousScorecard: ScorecardData | null,
  businessName: string
): string {
  const productivityDiff = scorecard.productivity_benchmark !== null && scorecard.productivity_actual !== null
    ? ((scorecard.productivity_actual - scorecard.productivity_benchmark) / scorecard.productivity_benchmark * 100).toFixed(1)
    : null

  // Check if this is a self-assessment (no consultant commentary)
  const isSelfAssessment = !scorecard.consultant_name && !scorecard.biggest_opportunity

  return `You are a business performance advisor providing insights for a monthly business scorecard review.

BUSINESS: ${businessName}
MONTH: ${scorecard.month}
TYPE: ${isSelfAssessment ? 'Self-Assessment' : 'Consultant Review'}

OVERALL SCORE: ${scorecard.total_score}/100 (${scorecard.rag_status.toUpperCase()})

=== FINANCIAL PERFORMANCE ===
Revenue vs Target: ${formatVariance(scorecard.revenue_variance)}
Gross Profit vs Target: ${formatVariance(scorecard.gross_profit_variance)}
Overheads vs Budget: ${formatVariance(scorecard.overheads_variance)}
Net Profit vs Target: ${formatVariance(scorecard.net_profit_variance)}

=== PEOPLE & HR ===
Productivity Benchmark: ${scorecard.productivity_benchmark !== null ? `${scorecard.productivity_benchmark}K` : 'N/A'}
Productivity Actual: ${scorecard.productivity_actual !== null ? `${scorecard.productivity_actual}K` : 'N/A'}
Productivity vs Benchmark: ${productivityDiff !== null ? `${productivityDiff}%` : 'N/A'}
Leadership Assessment: ${formatQualitative(scorecard.leadership)}

=== MARKET ===
Market Demand: ${formatQualitative(scorecard.market_demand)}
Marketing Effectiveness: ${formatQualitative(scorecard.marketing)}

=== PRODUCT ===
Product Strength: ${formatQualitative(scorecard.product_strength)}

=== SUPPLIERS ===
Supplier Strength: ${formatQualitative(scorecard.supplier_strength)}

=== SALES ===
Sales Execution: ${formatQualitative(scorecard.sales_execution)}

${previousScorecard ? `
=== PREVIOUS MONTH (${previousScorecard.month}) ===
Previous Score: ${previousScorecard.total_score}/100 (${previousScorecard.rag_status.toUpperCase()})
Score Change: ${scorecard.total_score - previousScorecard.total_score} points
` : '=== PREVIOUS MONTH ===\nNo prior month data available'}

---

INCONSISTENCY DETECTION:
Flag these specific contradictions if present:
1. Strong market_demand (4-5) BUT negative revenue_variance - Note: "Strong market demand reported, yet revenue is below target. Consider what's blocking conversion."
2. Strong sales_execution (4-5) BUT low productivity scores (actual < benchmark) - Note: "Sales execution rated highly but productivity lags benchmark. Team may be stretched thin."
3. High leadership rating (4-5) BUT poor financial_performance (multiple negative variances) - Note: "Leadership rated confident despite financial headwinds. Review the basis for optimism."
4. Product rated as differentiated (4-5) BUT GP margins compressed (negative gross_profit_variance) - Note: "Product rated strong but GP margin under pressure. May indicate pricing power issue."
5. Positive revenue trend BUT negative net_profit_variance - Note: "Revenue growing but net profit declining. Review cost structure and overhead efficiency."

Only include an inconsistency if the data clearly shows the contradiction. Be specific about which data points conflict.

---

REQUIRED OUTPUT:
1. Executive Summary (150-250 words): Synthesize the scorecard into a clear narrative. Reference specific numbers and ratings. Highlight what's going well and what needs attention. Write in second person ("Your business...") for self-assessment context.

2. 5 Focus Points for Next Month: Key areas to monitor and improve based on this month's data. Each point should be specific, actionable, and grounded in the metrics. Focus on progress opportunities and areas needing attention. These should help the business owner know what to track and prioritize.

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

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
    })

    const prompt = buildPrompt(scorecard, previousScorecard, businessName)

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
