import Anthropic from 'npm:@anthropic-ai/sdk'

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
  aggregate: PortfolioAggregate
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
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { aggregate } = await req.json() as RequestBody

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
    })

    const prompt = buildPrompt(aggregate)

    const systemPrompt = `You are a senior business consultant analyzing a portfolio of ${aggregate.totalBusinesses} client businesses for a monthly review meeting. Respond ONLY with a valid JSON object, no other text.

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

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error generating portfolio analysis:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to generate portfolio analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
