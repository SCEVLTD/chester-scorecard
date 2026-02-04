# External Integrations

**Analysis Date:** 2026-02-02

## APIs & External Services

**AI/LLM:**
- Anthropic Claude API - AI analysis generation
  - SDK: `@anthropic-ai/sdk` (via npm: in Deno Edge Functions)
  - Auth: `ANTHROPIC_API_KEY` (Supabase Edge Function secret)
  - Models used:
    - `claude-sonnet-4-5-20250929` - Individual scorecard analysis (structured outputs via tool_use)
    - `claude-sonnet-4-20250514` - Portfolio-level analysis
  - **Note:** Model version updated 2026-02-03 from `20250514` to `20250929` (old model deprecated)
  - Edge Functions:
    - `supabase/functions/generate-analysis/index.ts` - Single scorecard AI analysis
    - `supabase/functions/generate-portfolio-analysis/index.ts` - Portfolio-wide analysis

## Data Storage

**Database:**
- Supabase PostgreSQL
  - Connection: `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`
  - Client: `@supabase/supabase-js` typed with `Database` interface
  - Location: `src/lib/supabase.ts`

**Tables:**
| Table | Purpose |
|-------|---------|
| `sectors` | UK SME business sectors (12 defaults seeded) |
| `businesses` | Client businesses with optional sector FK |
| `scorecards` | Monthly business scorecards with scores and AI analysis |
| `data_requests` | Magic link tokens for company data collection |
| `company_submissions` | Financial data submitted by companies |

**Schema:**
- Full schema: `supabase/migrations/00000000_full_schema.sql`
- Types: `src/types/database.types.ts` (manual TypeScript definitions)

**Row Level Security:**
- RLS enabled on all tables
- Policies by table:
  - `scorecards`: Admin full access; Business users can SELECT/INSERT/UPDATE own (by business_id)
  - `businesses`: Admin full access; Business users can SELECT own
  - `company_submissions`: Admin full access; Business users can INSERT/UPDATE own
- **Note:** Business user UPDATE policy on scorecards added 2026-02-03 (required for AI analysis save)

**File Storage:**
- None - No file uploads

**Caching:**
- TanStack Query client-side caching
  - staleTime: 5 minutes
  - gcTime: 1 hour
  - Config: `src/lib/query-client.ts`

## Authentication & Identity

**Auth Provider:**
- None (no user authentication)
- Public access via Supabase anon key
- Magic links for company data submission (token-based, not auth)

**Magic Link System:**
- Token generation: `src/lib/magic-link.ts`
- 256-bit random tokens (crypto.getRandomValues)
- 7-day expiry default
- Flow: Consultant creates request -> company receives link -> submits data

## Monitoring & Observability

**Error Tracking:**
- None configured (console.error only)

**Logs:**
- Browser console logging
- Edge Function console output (Supabase logs)

## CI/CD & Deployment

**Hosting:**
- Vercel (frontend SPA)
  - Config: `vercel.json`
  - SPA rewrites: all routes -> `/index.html`

**Database/Functions:**
- Supabase managed
  - Project: `hknwkqhckdmosarywaio`
  - Region: Not specified

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars (Frontend):**
| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |

**Required env vars (Edge Functions):**
| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude API access |

**Secrets location:**
- Frontend: `.env.local` (gitignored)
- Edge Functions: Supabase dashboard secrets

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Edge Function Details

**generate-analysis:**
- Endpoint: `POST /functions/v1/generate-analysis`
- Input: `{ scorecard, previousScorecard, businessName }`
- Output: Structured JSON with execSummary, topQuestions, actions30Day, inconsistencies, trendBreaks
- Uses Claude structured outputs beta

**generate-portfolio-analysis:**
- Endpoint: `POST /functions/v1/generate-portfolio-analysis`
- Input: `{ aggregate }` (pre-aggregated portfolio data)
- Output: portfolioSummary, commonThemes, attentionPriorities, strategicRecommendations, sectorInsights
- Uses standard Claude messages API

**Client Integration:**
```typescript
// Example: Invoking Edge Function from frontend
const { data, error } = await supabase.functions.invoke('generate-analysis', {
  body: { scorecard, previousScorecard, businessName },
})
```

## Data Flow Patterns

**Scorecard AI Analysis:**
1. User saves scorecard -> stored in `scorecards` table
2. User clicks "Generate Analysis" -> `useGenerateAnalysis` hook
3. Edge Function called with scorecard data
4. Claude generates structured analysis
5. Analysis saved to `scorecards.ai_analysis` JSONB column
6. Query cache invalidated, UI updates

**Company Data Submission:**
1. Consultant creates data request -> `data_requests` table with token
2. Magic link emailed to company (manual process)
3. Company visits `/submit/:token`
4. Company submits financial data -> `company_submissions` table
5. Request status updated to "submitted"
6. Consultant creates scorecard with linked submission

---

*Integration audit: 2026-02-02*
