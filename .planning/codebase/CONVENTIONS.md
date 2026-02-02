# Coding Conventions

**Analysis Date:** 2026-02-02

## Naming Patterns

**Files:**
- Components: `kebab-case.tsx` (e.g., `financial-section.tsx`, `error-boundary.tsx`)
- Hooks: `use-{name}.ts` (e.g., `use-scorecards.ts`, `use-ai-analysis.ts`)
- Schemas: `{domain}.ts` (e.g., `scorecard.ts`, `business.ts`)
- Types: `{domain}.types.ts` (e.g., `database.types.ts`, `ai-analysis.types.ts`)
- Utils: `{purpose}.ts` (e.g., `scoring.ts`, `utils.ts`, `variance-calculator.ts`)

**Functions:**
- camelCase for all functions: `scoreFinancialMetric`, `calculateTotalScore`, `useCreateScorecard`
- Hooks prefixed with `use`: `useBusinessScorecards`, `useGenerateAnalysis`
- Boolean functions use `is/has/can`: `isNaN`

**Variables:**
- camelCase: `totalScore`, `businessId`, `previousScorecard`
- Constants: UPPER_SNAKE_CASE for lookup maps: `LEADERSHIP_SCORES`, `MARKET_DEMAND_SCORES`

**Types:**
- PascalCase: `ScorecardData`, `AIAnalysis`, `TrendDirection`
- Database types match table names: `Scorecard`, `Business`, `DataRequest`
- Insert types suffixed: `ScorecardInsert`, `BusinessInsert`

## Code Style

**Formatting:**
- No Prettier config detected - relies on ESLint and editor defaults
- 2-space indentation (inferred from files)
- Single quotes for strings
- No trailing commas in function parameters
- Trailing commas in arrays/objects

**Linting:**
- ESLint 9 with flat config: `eslint.config.js`
- TypeScript ESLint for type-aware rules
- React Hooks plugin for hooks rules
- React Refresh plugin for Vite HMR

**Key ESLint Configuration:**
```javascript
// From eslint.config.js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
  },
])
```

## Import Organization

**Order:**
1. React imports first
2. Third-party libraries (wouter, react-hook-form, date-fns, etc.)
3. Path alias imports (`@/hooks/...`, `@/components/...`, `@/lib/...`)
4. Type imports with `type` keyword

**Path Aliases:**
- `@/*` maps to `./src/*`
- Configured in both `tsconfig.app.json` and `vite.config.ts`

**Example Import Pattern:**
```typescript
// From src/pages/scorecard.tsx
import { useMemo, useEffect, useState } from 'react'
import { useParams, useLocation, useSearch } from 'wouter'
import { useForm, Controller, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, subMonths, startOfMonth } from 'date-fns'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { useBusinesses } from '@/hooks/use-businesses'
import { scorecardSchema, type ScorecardData } from '@/schemas/scorecard'
import type { Scorecard } from '@/types/database.types'
```

## Error Handling

**Patterns:**
- Try/catch in async mutation handlers
- Toast notifications for user-facing errors: `toast.error('Failed to save scorecard')`
- Console logging for debugging: `console.error('Failed to save scorecard:', error)`
- Form validation errors via Zod + react-hook-form display inline

**Supabase Error Handling:**
```typescript
// Pattern from use-scorecards.ts
const { data, error } = await supabase.from('scorecards').insert(scorecard).select().single()
if (error) throw error
return data as Scorecard
```

**Mutation Error Display:**
```tsx
// Pattern from scorecard.tsx
{mutationError && (
  <p className="text-red-500 text-sm">
    Error: {mutationError.message || 'Failed to save scorecard'}
  </p>
)}
```

**Error Boundary:**
- Class component at app root: `src/components/error-boundary.tsx`
- Catches uncaught errors and displays fallback UI
- Logs errors to console in `componentDidCatch`

## Logging

**Framework:** Browser console (no dedicated logging library)

**Patterns:**
- `console.error()` for error logging in catch blocks
- No structured logging or log levels
- Error boundary logs via `console.error('Uncaught error:', error, errorInfo)`

## Comments

**When to Comment:**
- JSDoc blocks on exported functions explaining purpose, params, returns
- Inline comments for scoring thresholds and business logic
- Phase comments to organize code sections (e.g., `// Phase 3`, `// Phase 4`)

**JSDoc Pattern:**
```typescript
/**
 * Score financial metrics where higher variance is better
 * (Revenue, Gross Profit, Net Profit vs Target)
 *
 * Formula from Nick's spec:
 * - >= +10% = 10 points
 * - +5% to +9% = 8 points
 * - -4% to +4% = 6 points
 * - -9% to -5% = 3 points
 * - <= -10% = 0 points
 *
 * @param variancePercent The percentage variance from target (-100 to +100)
 * @returns Score from 0-10
 */
export function scoreFinancialMetric(variancePercent: number): number { ... }
```

**Section Comments:**
```typescript
// ============================================================================
// QUALITATIVE SCORING (Phase 3)
// ============================================================================
```

## Function Design

**Size:** Functions are focused and small (typically 10-30 lines)

**Parameters:**
- Destructured objects for multiple parameters
- Optional fields with `?` operator
- Default values via `||` or `??` operators

**Return Values:**
- Explicit return types on exported functions
- Early returns for guard clauses (`if (isNaN(value)) return 0`)
- Null coalescence for optional values (`data.leadership || ''`)

## Module Design

**Exports:**
- Named exports for all functions, types, and constants
- No default exports except for page components and App
- One primary concern per file

**Barrel Files:**
- Not used - direct imports to specific files

## Component Design

**Pattern:**
- Functional components with hooks
- Props interfaces defined inline or with `interface`
- FormProvider pattern for deeply nested form components
- useFormContext for child components accessing form state

**Example Component Structure:**
```tsx
interface MetricRowProps {
  label: string
  name: keyof ScorecardData
  score: number
  helpText?: string
}

function MetricRow({ label, name, score, helpText }: MetricRowProps) {
  const { register, formState: { errors } } = useFormContext<ScorecardData>()
  // ... component logic
  return (
    <div className="...">
      {/* JSX */}
    </div>
  )
}

export function FinancialSection() {
  const { watch } = useFormContext<ScorecardData>()
  // ... component logic
  return (
    <Card>
      {/* Uses MetricRow internally */}
    </Card>
  )
}
```

## TypeScript Patterns

**Strict Mode:** Enabled (`"strict": true`)

**Type Inference:**
- Let TypeScript infer where possible
- Explicit types on function signatures
- `as const` for constant arrays/objects with literal types

**Database Types:**
- Manual type definitions in `src/types/database.types.ts`
- Row/Insert/Update variants for each table
- Type aliases for convenience: `export type Scorecard = Database['public']['Tables']['scorecards']['Row']`

**Zod Schema Types:**
- Infer types from schemas: `type ScorecardData = z.infer<typeof scorecardSchema>`
- Coercion for form inputs: `z.number()` with `valueAsNumber: true`

## UI Component Patterns

**shadcn/ui:**
- Components in `src/components/ui/`
- Use `cn()` utility for className merging
- Radix primitives for accessibility
- class-variance-authority (cva) for variant styling

**Tailwind CSS:**
- Tailwind v4 with inline theme configuration
- CSS variables for colors: `--color-primary`, `--color-muted-foreground`
- Responsive prefixes: `md:`, `lg:`
- Grid layouts: `grid grid-cols-12 gap-4`

---

*Convention analysis: 2026-02-02*
