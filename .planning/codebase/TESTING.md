# Testing Patterns

**Analysis Date:** 2026-02-02

## Test Framework

**Runner:**
- Vitest 4.0.18
- Config: `vitest.config.ts`

**Assertion Library:**
- Vitest built-in `expect` (Jest-compatible API)
- `@testing-library/jest-dom` for DOM matchers

**Run Commands:**
```bash
npm run test           # Watch mode (vitest)
npm run test:run       # Single run (vitest run)
npm run test:coverage  # Coverage report (vitest run --coverage)
```

## Test File Organization

**Location:**
- Co-located with source files: `src/lib/scoring.test.ts` alongside `src/lib/scoring.ts`

**Naming:**
- Pattern: `{filename}.test.ts` or `{filename}.test.tsx`
- Matches Vitest config include: `src/**/*.{test,spec}.{ts,tsx}`

**Structure:**
```
src/
├── lib/
│   ├── scoring.ts
│   └── scoring.test.ts    # Tests alongside implementation
├── test/
│   └── setup.ts           # Global test setup
```

## Test Structure

**Suite Organization:**
```typescript
// From src/lib/scoring.test.ts
import { describe, it, expect } from 'vitest'
import { scoreFinancialMetric, scoreOverheads } from './scoring'

describe('scoreFinancialMetric', () => {
  it('returns 10 for variance >= +10%', () => {
    expect(scoreFinancialMetric(10)).toBe(10)
    expect(scoreFinancialMetric(15)).toBe(10)
    expect(scoreFinancialMetric(100)).toBe(10)
  })

  it('returns 8 for variance +5% to +9%', () => {
    expect(scoreFinancialMetric(5)).toBe(8)
    expect(scoreFinancialMetric(9)).toBe(8)
    expect(scoreFinancialMetric(9.9)).toBe(8)
  })

  it('handles NaN by returning 0', () => {
    expect(scoreFinancialMetric(NaN)).toBe(0)
  })
})
```

**Patterns:**
- `describe` blocks per function/feature
- `it` statements describe expected behavior
- Multiple assertions per test for boundary conditions
- Edge case tests (NaN, null, boundaries)

## Test Setup

**Global Setup File:** `src/test/setup.ts`

```typescript
import '@testing-library/jest-dom'

// Mock ResizeObserver for Radix UI components
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock

// Mock matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})
```

**Vitest Configuration:**
```typescript
// From vitest.config.ts
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,                         // No need to import describe/it/expect
    environment: 'jsdom',                  // Browser-like environment
    setupFiles: ['./src/test/setup.ts'],   // Global setup
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

## Mocking

**Framework:** No dedicated mocking library - uses Vitest built-in mocking

**Browser API Mocks (in setup.ts):**
- `ResizeObserver` - for Radix UI components
- `matchMedia` - for responsive components

**What to Mock:**
- Browser APIs not available in jsdom (ResizeObserver, matchMedia)
- External services would need Supabase client mocking (not implemented yet)

**What NOT to Mock:**
- Pure functions (scoring, calculations) - test directly
- Internal module dependencies

## Coverage

**Requirements:** None enforced (no coverage thresholds configured)

**Provider:** v8 (`@vitest/coverage-v8`)

**View Coverage:**
```bash
npm run test:coverage
# Outputs to terminal (text) and ./coverage/ directory (json, html)
```

**Coverage Configuration:**
```typescript
// From vitest.config.ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: [
    'node_modules/',
    'src/test/',
    'src/components/ui/',  // Excludes shadcn components
  ],
},
```

## Test Types

**Unit Tests:**
- Pure function testing for scoring logic
- Located in `src/lib/scoring.test.ts`
- Tests mathematical formulas and edge cases

**Integration Tests:**
- Not implemented
- Would test component + hook combinations

**E2E Tests:**
- Not implemented
- No Playwright/Cypress configuration detected

## Current Test Coverage

**Tested:**
- `src/lib/scoring.ts` - Comprehensive tests for:
  - `scoreFinancialMetric()` - boundary conditions, NaN handling
  - `scoreOverheads()` - inverted scoring logic
  - `calculateFinancialSubtotal()` - sum calculations
  - `calculateProductivityVariance()` - percentage calculations
  - `scoreProductivity()` - threshold scoring
  - `getRagStatus()` - RAG color thresholds
  - `calculateTrend()` - trend direction calculation
  - `calculateTotalScore()` - full scorecard calculation
  - All constant score maps (LEADERSHIP_SCORES, MARKET_DEMAND_SCORES, etc.)

**Not Tested:**
- Components (no React Testing Library component tests)
- Hooks (no mocked Supabase tests)
- API integration
- Form validation flows

## Common Patterns

**Boundary Testing:**
```typescript
it('returns 8 for variance +5% to +9%', () => {
  expect(scoreFinancialMetric(5)).toBe(8)    // Lower boundary
  expect(scoreFinancialMetric(9)).toBe(8)    // Upper boundary
  expect(scoreFinancialMetric(9.9)).toBe(8)  // Just under next threshold
})
```

**Edge Case Testing:**
```typescript
it('handles NaN by returning 0', () => {
  expect(scoreFinancialMetric(NaN)).toBe(0)
})

it('returns null when no previous score', () => {
  expect(calculateTrend(75, null)).toBeNull()
})
```

**Floating Point Testing:**
```typescript
it('calculates positive variance correctly', () => {
  // Use toBeCloseTo for floating point comparisons
  expect(calculateProductivityVariance(2.0, 2.3)).toBeCloseTo(15, 5)
})
```

**Integration Data Objects:**
```typescript
it('calculates full score for all excellent metrics', () => {
  const data = {
    revenueVariance: 15,
    grossProfitVariance: 15,
    overheadsVariance: -15,
    netProfitVariance: 15,
    productivityBenchmark: 2.0,
    productivityActual: 2.4,
    leadership: 'aligned',
    marketDemand: 'strong',
    // ... full data object
  }

  expect(calculateTotalScore(data)).toBe(100)
})
```

## Writing New Tests

**For Pure Functions:**
1. Create `{filename}.test.ts` next to source file
2. Import functions under test
3. Use `describe` per function, `it` per behavior
4. Test boundaries, edge cases, happy path

**For Components (pattern not established):**
1. Would create `{component}.test.tsx`
2. Use `@testing-library/react` render/screen/fireEvent
3. Mock useFormContext and other hooks as needed
4. Test user interactions and rendered output

**For Hooks (pattern not established):**
1. Would create `{hook}.test.ts`
2. Mock Supabase client responses
3. Use `@testing-library/react-hooks` or `renderHook`
4. Test loading states, error states, success states

---

*Testing analysis: 2026-02-02*
