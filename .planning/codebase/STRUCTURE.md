# Codebase Structure

**Analysis Date:** 2026-02-02

## Directory Layout

```
Chester/
├── src/                    # Application source code
│   ├── components/         # React components
│   │   ├── charts/         # Chart components (recharts)
│   │   ├── compare/        # Business comparison features
│   │   ├── pdf/            # PDF generation components
│   │   ├── portfolio/      # Portfolio dashboard components
│   │   └── ui/             # shadcn/ui primitives
│   ├── hooks/              # TanStack Query hooks
│   ├── lib/                # Utility functions and clients
│   ├── pages/              # Route-level page components
│   ├── schemas/            # Zod validation schemas
│   ├── test/               # Test setup and utilities
│   └── types/              # TypeScript type definitions
├── supabase/               # Supabase configuration
│   ├── functions/          # Edge functions (Deno)
│   │   ├── generate-analysis/
│   │   └── generate-portfolio-analysis/
│   └── migrations/         # SQL migration files
├── public/                 # Static assets
├── dist/                   # Build output (gitignored)
└── Docs/                   # Documentation
```

## Directory Purposes

**`src/components/`:**
- Purpose: All React components organized by feature
- Contains: Feature components, section forms, display components
- Key files:
  - `financial-section.tsx`: Financial metrics form section
  - `people-section.tsx`: HR/People metrics form section
  - `score-header.tsx`: Total score display with RAG indicator
  - `error-boundary.tsx`: App-level error boundary
  - `confirmation-screen.tsx`: Post-submission success screen

**`src/components/ui/`:**
- Purpose: shadcn/ui design system primitives
- Contains: Button, Card, Input, Label, Select, Dialog, Tabs, Alert, Badge, etc.
- Key files: All follow shadcn/ui patterns with CVA variants

**`src/components/charts/`:**
- Purpose: Data visualization using recharts
- Contains: Score trend charts, section comparison charts
- Key files:
  - `score-trend-chart.tsx`: Line chart for score history
  - `section-breakdown-chart.tsx`: Bar chart for section scores

**`src/components/compare/`:**
- Purpose: Side-by-side business comparison
- Contains: Business selector, comparison table columns
- Key files:
  - `business-selector.tsx`: Multi-select for comparing businesses
  - `comparison-columns.tsx`: Metric comparison table

**`src/components/pdf/`:**
- Purpose: PDF export functionality via @react-pdf/renderer
- Contains: PDF document templates and styles
- Key files:
  - `scorecard-pdf.tsx`: Full scorecard PDF template
  - `pdf-styles.ts`: React-PDF stylesheet definitions

**`src/components/portfolio/`:**
- Purpose: Portfolio overview and heatmap
- Contains: Portfolio cards, heatmap visualization
- Key files:
  - `portfolio-heatmap.tsx`: Section score heatmap grid
  - `portfolio-analysis-card.tsx`: AI analysis display

**`src/hooks/`:**
- Purpose: TanStack Query hooks for data operations
- Contains: Query and mutation hooks for all entities
- Key files:
  - `use-scorecards.ts`: CRUD operations for scorecards
  - `use-businesses.ts`: Business entity operations
  - `use-ai-analysis.ts`: AI generation mutation
  - `use-portfolio-summary.ts`: Aggregated portfolio data
  - `use-data-requests.ts`: Magic link data requests
  - `use-company-submissions.ts`: Company financial submissions

**`src/lib/`:**
- Purpose: Shared utilities, clients, and pure functions
- Contains: Supabase client, scoring algorithms, mappers
- Key files:
  - `supabase.ts`: Supabase client initialization
  - `query-client.ts`: TanStack Query client configuration
  - `scoring.ts`: Score calculation functions (40 financial + 60 qualitative)
  - `utils.ts`: cn() classname utility
  - `variance-calculator.ts`: Submission-to-variance mapping
  - `scorecard-mapper.ts`: Database row to form data mapping

**`src/pages/`:**
- Purpose: Route-level page components
- Contains: Full page views for each route
- Key files:
  - `home.tsx`: Business list with sector filtering
  - `scorecard.tsx`: Scorecard form (create/edit)
  - `history.tsx`: Business scorecard history
  - `charts.tsx`: Score visualization page
  - `portfolio.tsx`: Portfolio dashboard
  - `compare.tsx`: Business comparison page
  - `company-submit.tsx`: Public company data submission form
  - `submission-success.tsx`: Post-submission thank you page

**`src/schemas/`:**
- Purpose: Zod validation schemas
- Contains: Form schemas, API response schemas
- Key files:
  - `scorecard.ts`: Main scorecard form validation (all sections)
  - `business.ts`: Business entity schema
  - `ai-analysis.ts`: AI response validation
  - `data-request.ts`: Magic link request schema
  - `company-submission.ts`: Company financial submission schema
  - `portfolio-analysis.ts`: Portfolio AI analysis schema

**`src/types/`:**
- Purpose: TypeScript type definitions
- Contains: Database types, custom interfaces
- Key files:
  - `database.types.ts`: Supabase table types (Row, Insert, Update)
  - `ai-analysis.types.ts`: AI analysis response types

**`src/test/`:**
- Purpose: Test setup and utilities
- Contains: Vitest configuration, test helpers
- Key files:
  - `setup.ts`: Jest-DOM matchers setup

**`supabase/functions/`:**
- Purpose: Deno-based serverless functions
- Contains: AI analysis edge functions
- Key files:
  - `generate-analysis/index.ts`: Single scorecard AI analysis
  - `generate-portfolio-analysis/index.ts`: Portfolio-wide AI analysis

**`supabase/migrations/`:**
- Purpose: Database schema migrations
- Contains: SQL migration files
- Key files:
  - `00000000_full_schema.sql`: Complete schema (sectors, businesses, scorecards, data_requests, company_submissions)

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React DOM root render
- `src/App.tsx`: App component with providers and routes
- `index.html`: HTML template with root div

**Configuration:**
- `vite.config.ts`: Vite build configuration
- `vitest.config.ts`: Test configuration
- `tsconfig.json`: TypeScript base config
- `tsconfig.app.json`: App-specific TS config
- `components.json`: shadcn/ui CLI config
- `eslint.config.js`: ESLint configuration
- `.env.local`: Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
- `vercel.json`: Vercel deployment config

**Core Logic:**
- `src/lib/scoring.ts`: All scoring algorithms and RAG thresholds
- `src/hooks/use-scorecards.ts`: Scorecard CRUD mutations
- `src/pages/scorecard.tsx`: Main form orchestration

**Testing:**
- `src/lib/scoring.test.ts`: Scoring function unit tests
- `src/test/setup.ts`: Test environment setup

## Naming Conventions

**Files:**
- Components: kebab-case (`financial-section.tsx`)
- Hooks: kebab-case with use- prefix (`use-scorecards.ts`)
- Schemas: kebab-case (`company-submission.ts`)
- Types: kebab-case with .types suffix (`database.types.ts`)

**Directories:**
- Feature groups: lowercase plural (`charts/`, `portfolio/`)
- UI primitives: `ui/` directory for shadcn components

**Exports:**
- Components: PascalCase named exports (`export function FinancialSection()`)
- Hooks: camelCase named exports (`export function useScorecards()`)
- Types: PascalCase (`export type Scorecard`)
- Utilities: camelCase (`export function calculateTotalScore()`)

## Where to Add New Code

**New Feature:**
- Primary code: `src/pages/[feature].tsx` for route
- Components: `src/components/[feature]/` subdirectory
- Hook: `src/hooks/use-[feature].ts`
- Schema: `src/schemas/[feature].ts`
- Tests: Co-located as `[file].test.ts`

**New Component/Module:**
- UI component: `src/components/[name].tsx`
- Feature-specific: `src/components/[feature]/[name].tsx`
- Shared utility: `src/lib/[name].ts`

**New API/Database Operation:**
- Hook: `src/hooks/use-[entity].ts`
- Add types to `src/types/database.types.ts`
- Migration: `supabase/migrations/YYYYMMDD_[description].sql`

**New Edge Function:**
- Create directory: `supabase/functions/[name]/`
- Entry file: `supabase/functions/[name]/index.ts`

**Utilities:**
- Shared helpers: `src/lib/[name].ts`
- Form helpers: `src/lib/validation-helpers.ts`

## Special Directories

**`dist/`:**
- Purpose: Vite build output
- Generated: Yes (by `npm run build`)
- Committed: No (gitignored)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No (gitignored)

**`.vercel/`:**
- Purpose: Vercel deployment state
- Generated: Yes (by Vercel CLI)
- Committed: No (gitignored)

**`Docs/`:**
- Purpose: Project documentation
- Generated: No
- Committed: Yes

**`.planning/`:**
- Purpose: GSD planning artifacts
- Generated: No
- Committed: Project-dependent

---

*Structure analysis: 2026-02-02*
