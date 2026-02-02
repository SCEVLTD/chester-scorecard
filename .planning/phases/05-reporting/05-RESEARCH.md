# Phase 5: Reporting - Research

**Researched:** 2026-02-02
**Domain:** Business reporting, PDF generation, data aggregation, AI insights
**Confidence:** HIGH

## Summary

Phase 5 Reporting builds on substantial existing infrastructure. The codebase already has:
- Full scoring system (`src/lib/scoring.ts`) with 0-100 scale and RAG thresholds (Green >= 75, Amber >= 60, Red < 60)
- PDF export via `@react-pdf/renderer` with Chester/Velocity branding, lazy-loaded for bundle size
- AI analysis generation via Supabase Edge Functions calling Claude Sonnet
- Portfolio heatmap showing all businesses x sections with color-coded scores
- Portfolio aggregation (`src/lib/portfolio-aggregator.ts`) that anonymizes data for AI prompts

The key gaps are:
1. **Meeting prep AI summary** - needs new Edge Function for aggregated meeting insights
2. **Month selection for heatmap** - current heatmap shows only latest month
3. **Improved individual scorecard display** - score more prominent, better flow

**Primary recommendation:** Leverage existing components. Create meeting prep AI summary as new Edge Function, add month filter to heatmap, and enhance scorecard display styling.

## Standard Stack

The established libraries/tools for this domain are already in use:

### Core (Existing)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-pdf/renderer | ^4.3.2 | PDF generation | React-native PDF rendering, already integrated |
| recharts | ^3.7.0 | Charts/visualizations | Already used for trend charts, section breakdowns |
| date-fns | ^4.1.0 | Date formatting | Already used throughout for month display |
| lucide-react | ^0.563.0 | Icons | Consistent with existing UI |

### Supporting (Existing)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| file-saver | ^2.0.5 | Download triggers | PDF export downloads |
| sonner | ^2.0.7 | Toast notifications | User feedback on operations |
| @tanstack/react-query | ^5.90.20 | Server state | All data fetching and mutations |

### Not Needed
| Library | Reason Not Needed |
|---------|-------------------|
| jsPDF | @react-pdf/renderer already integrated |
| chart.js | recharts already integrated |
| moment | date-fns already integrated |

**Installation:** No new packages needed - all dependencies exist.

## Architecture Patterns

### Existing Project Structure (Relevant to Phase 5)
```
src/
├── components/
│   ├── ai-analysis-panel.tsx      # Individual business AI display
│   ├── pdf-export-button.tsx      # PDF download trigger
│   ├── score-header.tsx           # Score + RAG badge display
│   ├── trend-indicator.tsx        # Score trend arrows
│   ├── portfolio/
│   │   ├── portfolio-heatmap.tsx  # Businesses x sections grid
│   │   └── portfolio-analysis-card.tsx  # Portfolio AI display
│   ├── pdf/
│   │   ├── scorecard-pdf.tsx      # PDF document component
│   │   ├── pdf-styles.ts          # StyleSheet for PDF
│   │   └── velocity-logo.ts       # Logo as base64
│   └── charts/
│       ├── score-trend-chart.tsx  # Line chart for score trends
│       └── section-breakdown-chart.tsx  # Bar chart for sections
├── hooks/
│   ├── use-ai-analysis.ts         # Individual AI generation
│   ├── use-portfolio-analysis.ts  # Portfolio AI generation
│   ├── use-portfolio-summary.ts   # Portfolio data fetching
│   ├── use-pdf-export.ts          # PDF generation hook
│   └── use-chart-data.ts          # Chart data transformation
├── lib/
│   ├── scoring.ts                 # Score calculation functions
│   ├── portfolio-aggregator.ts    # Anonymized aggregation
│   ├── pdf-data-mapper.ts         # Scorecard to PDF format
│   ├── chart-utils.ts             # Section scores calculation
│   └── heatmap-utils.ts           # Score to color mapping
├── schemas/
│   ├── ai-analysis.ts             # Individual AI response schema
│   └── portfolio-analysis.ts      # Portfolio AI response schema
└── pages/
    ├── scorecard.tsx              # Individual scorecard form/view
    └── portfolio.tsx              # Portfolio dashboard
```

### Pattern 1: AI Analysis Generation
**What:** Edge Function generates analysis, client validates with Zod, persists to database
**When to use:** Any AI-generated content that needs validation
**Example:**
```typescript
// Source: src/hooks/use-ai-analysis.ts
const { data, error } = await supabase.functions.invoke('generate-analysis', {
  body: { scorecard, previousScorecard, businessName },
})
const analysis = parseAIAnalysis(data)  // Zod validation
await supabase.from('scorecards').update({ ai_analysis: analysis }).eq('id', scorecardId)
```

### Pattern 2: Portfolio Aggregation for Anonymity
**What:** Client-side aggregation removes individual business identifiers before AI analysis
**When to use:** Any portfolio-level AI analysis
**Example:**
```typescript
// Source: src/lib/portfolio-aggregator.ts
export interface PortfolioAggregate {
  totalBusinesses: number
  distribution: { green: number; amber: number; red: number }
  averageScore: number
  scoreRange: { min: number; max: number }
  weakestSections: { section: string; avgScore: number }[]
  anomalies: { businessName: string; scoreChange: number }[]  // Names included for Chester admins
  businesses: { name: string; score: number; rag: string }[]
}
```

### Pattern 3: PDF Lazy Loading
**What:** @react-pdf/renderer (~1.2MB) loaded only when user clicks export
**When to use:** Always for PDF generation
**Example:**
```typescript
// Source: src/hooks/use-pdf-export.ts
const [{ pdf }, { ScorecardPdf }] = await Promise.all([
  import('@react-pdf/renderer'),
  import('@/components/pdf/scorecard-pdf'),
])
const blob = await pdf(ScorecardPdf({ scorecard, businessName })).toBlob()
saveAs(blob, filename)
```

### Pattern 4: Score Color Mapping
**What:** Consistent color coding based on percentage of max score
**When to use:** Heatmaps, badges, score displays
**Example:**
```typescript
// Source: src/lib/heatmap-utils.ts
export const SCORE_THRESHOLDS = {
  excellent: { min: 80, bg: 'bg-green-500', text: 'text-white' },
  good: { min: 60, bg: 'bg-green-300', text: 'text-green-900' },
  fair: { min: 40, bg: 'bg-amber-400', text: 'text-amber-900' },
  poor: { min: 20, bg: 'bg-orange-400', text: 'text-orange-900' },
  critical: { min: 0, bg: 'bg-red-500', text: 'text-white' },
}
```

### Anti-Patterns to Avoid
- **Don't calculate scores in components:** Use `calculateTotalScore()` and `calculateSectionScores()` from `@/lib/scoring`
- **Don't expose individual business data in aggregated views:** Always aggregate before displaying to admins
- **Don't inline PDF styles:** Use `@/components/pdf/pdf-styles.ts` for consistency
- **Don't load PDF library eagerly:** Always use dynamic import via `usePdfExport` hook

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Score calculation | Manual point tallying | `calculateTotalScore()` from `@/lib/scoring.ts` | Scoring formulas are complex with different thresholds per section |
| RAG status | Hardcoded thresholds | `getRagStatus()` from `@/lib/scoring.ts` | Thresholds may change; single source of truth |
| Section scores | Parse scorecard fields | `calculateSectionScores()` from `@/lib/chart-utils.ts` | Handles all qualitative lookup maps |
| PDF generation | HTML-to-PDF conversion | `@react-pdf/renderer` + `ScorecardPdf` component | Already styled, branded, tested |
| Score colors | Manual color logic | `getScoreColor()` from `@/lib/heatmap-utils.ts` | Consistent thresholds across all views |
| AI response parsing | Trust raw JSON | Zod schemas in `@/schemas/` | Validates structure, catches hallucinations |

**Key insight:** The existing scoring and formatting infrastructure is mature. New reporting features should compose existing utilities, not reimplement.

## Common Pitfalls

### Pitfall 1: Exposing Individual Business Data in Aggregated Views
**What goes wrong:** Leaking business names or data that could identify individual companies
**Why it happens:** Copy-pasting from individual views without considering anonymization
**How to avoid:**
- Portfolio AI prompts use aggregated stats, not raw scorecard data
- Meeting summary should reference themes, not specific businesses
- Only Chester admins see business names; aggregated views omit them
**Warning signs:** Business names appearing in "aggregated" displays

### Pitfall 2: AI Generation Timeouts
**What goes wrong:** Edge Function times out before AI response completes
**Why it happens:** Large prompts, slow AI responses
**How to avoid:**
- Pre-aggregate data client-side (reduces tokens 90%+)
- Limit portfolio analysis to 20 businesses
- Show loading state with realistic time estimate (5-15 seconds)
**Warning signs:** 504 Gateway Timeout errors, empty responses

### Pitfall 3: PDF Bundle Bloat
**What goes wrong:** @react-pdf/renderer adds 1.2MB to initial bundle
**Why it happens:** Importing PDF library at top of file
**How to avoid:**
- Always use dynamic `import()` for PDF library
- Use existing `usePdfExport` hook which handles lazy loading
**Warning signs:** Slow initial page load, large bundle size warnings

### Pitfall 4: Incorrect Score Display
**What goes wrong:** Displayed score doesn't match stored score
**Why it happens:** Recalculating scores in UI instead of using stored value
**How to avoid:**
- Display `scorecard.total_score` from database, not recalculated value
- Only recalculate in real-time during form editing
**Warning signs:** Score changes on refresh without data change

### Pitfall 5: Month Filter Affecting Wrong Data
**What goes wrong:** Month filter doesn't work correctly with portfolio data
**Why it happens:** Portfolio queries fetch latest, not specific month
**How to avoid:**
- Add month parameter to portfolio queries
- Filter scorecards by month server-side when possible
- Clear visual indication of which month is being viewed
**Warning signs:** Data unchanged when month filter changes

## Code Examples

Verified patterns from the existing codebase:

### Score Display with RAG Badge
```typescript
// Source: src/components/score-header.tsx
import { Badge } from '@/components/ui/badge'
import { getRagStatus } from '@/lib/scoring'
import { cn } from '@/lib/utils'

const ragConfig = {
  green: { label: 'Green', className: 'bg-green-500 hover:bg-green-600 text-white' },
  amber: { label: 'Amber', className: 'bg-amber-500 hover:bg-amber-600 text-white' },
  red: { label: 'Red', className: 'bg-red-500 hover:bg-red-600 text-white' },
}

export function ScoreHeader({ totalScore }: { totalScore: number }) {
  const rag = getRagStatus(totalScore)
  const { label, className } = ragConfig[rag]

  return (
    <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
      <div>
        <p className="text-sm text-muted-foreground">Total Score</p>
        <p className="text-3xl font-bold">{totalScore} / 100</p>
      </div>
      <Badge className={cn('px-3 py-1 text-sm', className)}>{label}</Badge>
    </div>
  )
}
```

### Portfolio Heatmap with Section Scores
```typescript
// Source: src/components/portfolio/portfolio-heatmap.tsx
import { SECTION_CONFIG, calculateSectionScores } from '@/lib/chart-utils'
import { getScoreColor } from '@/lib/heatmap-utils'

const sectionKeys = ['financial', 'people', 'market', 'product', 'suppliers', 'sales'] as const

// For each business, calculate section scores and display with color coding
const sectionScores = scorecard ? calculateSectionScores(scorecard) : null
const colors = getScoreColor(score, maxScore)
// Apply colors.bg and colors.text to cell
```

### AI Analysis Panel with Auto-Generation
```typescript
// Source: src/components/ai-analysis-panel.tsx
const generateAnalysis = useGenerateAnalysis()

useEffect(() => {
  if (scorecard.ai_analysis) {
    setAnalysis(scorecard.ai_analysis as unknown as AIAnalysis)
  } else if (!generateAnalysis.isPending && !generateAnalysis.isSuccess) {
    generateAnalysis.mutate({
      scorecardId: scorecard.id,
      scorecard,
      previousScorecard,
      businessName,
    })
  }
}, [scorecard.id])
```

### PDF Export with Lazy Loading
```typescript
// Source: src/hooks/use-pdf-export.ts
const exportPdf = useCallback(async (scorecard: Scorecard, businessName: string) => {
  setIsGenerating(true)
  try {
    const [{ pdf }, { ScorecardPdf }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('@/components/pdf/scorecard-pdf'),
    ])
    const blob = await pdf(ScorecardPdf({ scorecard, businessName })).toBlob()
    const safeName = businessName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase()
    saveAs(blob, `${safeName}-scorecard-${scorecard.month}.pdf`)
  } catch (err) {
    setError(err instanceof Error ? err : new Error('PDF generation failed'))
  } finally {
    setIsGenerating(false)
  }
}, [])
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jsPDF for PDF | @react-pdf/renderer | Already in codebase | React component model for PDF |
| Chart.js | Recharts | Already in codebase | Better React integration |
| Manual score calc | Centralized scoring.ts | Already in codebase | Single source of truth |

**Current and stable:**
- @react-pdf/renderer v4.x with React 19 compatibility
- Recharts v3.x stable
- Supabase Edge Functions with Anthropic SDK

## Open Questions

Things that couldn't be fully resolved:

1. **Meeting prep AI content format**
   - What we know: Should be aggregated, not identify individual businesses
   - What's unclear: Exact structure - bullet points? Sections? Talking points format?
   - Recommendation: Follow existing `PortfolioAnalysis` schema pattern with: summary, themes, priorities, recommendations

2. **Heatmap month filter UX**
   - What we know: Need to show historical months, not just latest
   - What's unclear: Dropdown vs tabs vs calendar picker?
   - Recommendation: Use existing Select component (consistent with month selector in scorecard form)

3. **PDF for meeting prep summary**
   - What we know: REPORT-03 specifies PDF for individual business summary
   - What's unclear: Does meeting summary also need PDF export?
   - Recommendation: Individual PDF exists; meeting summary likely just on-screen display initially

## Sources

### Primary (HIGH confidence)
- `src/lib/scoring.ts` - Full scoring implementation reviewed
- `src/hooks/use-pdf-export.ts` - PDF generation pattern reviewed
- `src/components/portfolio/portfolio-heatmap.tsx` - Heatmap implementation reviewed
- `src/lib/portfolio-aggregator.ts` - Aggregation pattern reviewed
- `supabase/functions/generate-analysis/index.ts` - AI Edge Function reviewed
- `supabase/functions/generate-portfolio-analysis/index.ts` - Portfolio AI reviewed

### Secondary (MEDIUM confidence)
- Package.json dependencies verified
- Existing component patterns consistent across codebase

### Tertiary (LOW confidence)
- None - all claims verified against existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already integrated and working
- Architecture: HIGH - patterns derived from existing working code
- Pitfalls: HIGH - based on existing code patterns and documented decisions

**Research date:** 2026-02-02
**Valid until:** 2026-02-15 (stable codebase, short project timeline)

## Implementation Recommendations

Based on research, Phase 5 should be structured as:

### Plan 05-01: Individual Scorecard Display Enhancements
- Prominent score display (REPORT-01)
- Ensure AI analysis generates within 10 seconds (REPORT-02)
- PDF export already works (REPORT-05)

### Plan 05-02: Portfolio Reporting Features
- Month selector for heatmap (REPORT-06)
- Aggregated portfolio summary (REPORT-03)
- Meeting prep AI summary (REPORT-04)

Key files to modify/create:
- `src/pages/portfolio.tsx` - Add month filter, meeting summary button
- `src/hooks/use-portfolio-summary.ts` - Add month parameter
- `supabase/functions/generate-meeting-summary/index.ts` - New Edge Function
- `src/schemas/meeting-summary.ts` - New Zod schema
- `src/components/meeting-summary-card.tsx` - New display component

The existing infrastructure handles most requirements. Focus on composition and new meeting summary feature.
