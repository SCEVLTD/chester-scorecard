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
  aggregatedData: PortfolioAggregate
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
    const { aggregatedData } = await req.json() as RequestBody

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
    })

    const prompt = buildPrompt(aggregatedData)

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

    return new Response(JSON.stringify(parsed), {
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
