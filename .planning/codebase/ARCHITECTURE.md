# Architecture

**Analysis Date:** 2026-02-02

## Pattern Overview

**Overall:** Feature-based SPA with React + Supabase BaaS

**Key Characteristics:**
- Single Page Application with client-side routing (wouter)
- Supabase handles all backend concerns (database, auth, edge functions)
- TanStack Query for server state management with optimistic updates
- Form-centric UI with Zod validation and react-hook-form
- Domain-driven feature organization (scorecards, portfolios, comparisons)

## Layers

**Pages (View Layer):**
- Purpose: Route-level components that orchestrate features
- Location: `src/pages/`
- Contains: Page components, route-specific logic, layout composition
- Depends on: Hooks, Components, Schemas
- Used by: App router (`src/App.tsx`)

**Components (UI Layer):**
- Purpose: Reusable and feature-specific UI components
- Location: `src/components/`
- Contains: Form sections, display components, PDF generation
- Depends on: UI primitives, Hooks, Lib utilities
- Used by: Pages

**UI Primitives:**
- Purpose: shadcn/ui design system components
- Location: `src/components/ui/`
- Contains: Button, Card, Input, Select, Dialog, Tabs, etc.
- Depends on: Radix UI primitives, class-variance-authority
- Used by: All components and pages

**Hooks (Data Layer):**
- Purpose: Data fetching, mutations, and derived state
- Location: `src/hooks/`
- Contains: TanStack Query hooks wrapping Supabase operations
- Depends on: Supabase client, Schemas
- Used by: Pages, Components

**Lib (Utilities):**
- Purpose: Pure functions, calculations, and shared utilities
- Location: `src/lib/`
- Contains: Scoring algorithms, mappers, validators, Supabase client
- Depends on: Types, Schemas
- Used by: Hooks, Components, Pages

**Schemas (Validation):**
- Purpose: Zod schemas for runtime validation
- Location: `src/schemas/`
- Contains: Form validation schemas, API response schemas
- Depends on: Zod
- Used by: Forms (via zodResolver), Hooks (for parsing)

**Types (Type Definitions):**
- Purpose: TypeScript type definitions, especially database types
- Location: `src/types/`
- Contains: Supabase database types, AI analysis types
- Depends on: None
- Used by: All layers

**Supabase Edge Functions (Backend):**
- Purpose: Server-side AI processing via Anthropic API
- Location: `supabase/functions/`
- Contains: Deno-based edge functions for analysis generation
- Depends on: Anthropic SDK
- Used by: Client via `supabase.functions.invoke()`

## Data Flow

**Scorecard Creation Flow:**

1. User navigates to `/business/:businessId/scorecard`
2. `ScorecardPage` renders form with `useForm()` + `zodResolver(scorecardSchema)`
3. Form sections watch values and compute scores in real-time via `calculateTotalScore()`
4. On submit, `useCreateScorecard()` mutation calls Supabase insert
5. Mutation success invalidates relevant query caches
6. User redirected to confirmation screen

**Company Data Submission Flow (Magic Link):**

1. Consultant creates data request via `useCreateDataRequest()`
2. Company user opens `/submit/:token` URL
3. `CompanySubmitPage` validates token via `useDataRequestByToken()`
4. Financial data submitted via `useCreateCompanySubmission()`
5. Consultant creates scorecard, system auto-populates from submission

**AI Analysis Generation Flow:**

1. User clicks "Generate Analysis" on scorecard
2. `useGenerateAnalysis()` mutation invokes `generate-analysis` edge function
3. Edge function calls Claude Sonnet 4.5 with structured output
4. Response validated and saved to `scorecards.ai_analysis` column
5. UI displays formatted analysis

**Meeting Prep Generation Flow:**

1. Admin clicks "Meeting Prep" on portfolio page
2. `useMeetingSummary()` hook aggregates portfolio data via `usePortfolioAggregate()`
3. Hook invokes `generate-meeting-summary` edge function with `persist: true`
4. Edge function generates AI summary via Claude, saves to `meetings` table
5. Returns `meetingId`, user redirected or modal shown with AI notes
6. User adds notes in textarea (debounced auto-save via `useSaveMeetingNotes`)
7. User clicks "Create Action" on suggestions → `ActionModal` with `meeting_id` FK
8. User clicks "Finalize" → status locked, notes become read-only

**State Management:**
- Server state: TanStack Query with 5-minute stale time
- Form state: react-hook-form with Zod validation
- Local UI state: React useState for modals, filters, selections
- URL state: wouter for routing, URLSearchParams for shareable filters

## Key Abstractions

**Scorecard:**
- Purpose: Monthly business health assessment with quantitative and qualitative metrics
- Examples: `src/schemas/scorecard.ts`, `src/hooks/use-scorecards.ts`
- Pattern: 100-point scale with RAG status (Red/Amber/Green)

**Business:**
- Purpose: Entity being tracked, has many scorecards
- Examples: `src/hooks/use-businesses.ts`, `src/types/database.types.ts`
- Pattern: Simple CRUD with sector association

**Data Request / Company Submission:**
- Purpose: Magic link workflow for companies to submit financials
- Examples: `src/hooks/use-data-requests.ts`, `src/pages/company-submit.tsx`
- Pattern: Token-based access with expiration and status tracking

**Scoring Functions:**
- Purpose: Deterministic score calculation from variance inputs
- Examples: `src/lib/scoring.ts`
- Pattern: Pure functions with lookup tables for qualitative scores

**Meeting:**
- Purpose: Persistent record of Friday meetings with AI summaries and user notes
- Examples: `src/hooks/use-meetings.ts`, `src/pages/meetings.tsx`, `src/pages/meeting.tsx`
- Pattern: Granola-style UX — AI notes + user notes side-by-side with debounced auto-save
- Data: `meetings` table with portfolio_snapshot (JSONB), ai_summary (JSONB), user_notes (text)
- Workflow: draft → finalized (locks editing), supports full-text search via GIN index
- Actions: Can link actions to meetings via `actions.meeting_id` FK

## Entry Points

**Client Entry:**
- Location: `src/main.tsx`
- Triggers: Browser load
- Responsibilities: React root render, strict mode wrapper

**App Root:**
- Location: `src/App.tsx`
- Triggers: Main entry
- Responsibilities: Provider setup (QueryClient, Toaster), route definitions, error boundary

**Edge Function - Analysis:**
- Location: `supabase/functions/generate-analysis/index.ts`
- Triggers: `supabase.functions.invoke('generate-analysis')`
- Responsibilities: Claude API call, structured output parsing, response formatting

**Edge Function - Portfolio Analysis:**
- Location: `supabase/functions/generate-portfolio-analysis/index.ts`
- Triggers: `supabase.functions.invoke('generate-portfolio-analysis')`
- Responsibilities: Multi-business analysis, trend detection across portfolio

**Edge Function - Meeting Summary:**
- Location: `supabase/functions/generate-meeting-summary/index.ts`
- Triggers: `supabase.functions.invoke('generate-meeting-summary')`
- Responsibilities: AI meeting prep generation, optional persistence to meetings table

**Edge Function - Update Meeting:**
- Location: `supabase/functions/update-meeting/index.ts`
- Triggers: `supabase.functions.invoke('update-meeting')`
- Responsibilities: Save user notes, update attendees, finalize meetings

## Error Handling

**Strategy:** Layered error handling with user-friendly feedback

**Patterns:**
- React ErrorBoundary wraps entire app (`src/components/error-boundary.tsx`)
- TanStack Query retry (1 attempt) with error state in hooks
- Form validation errors displayed inline via react-hook-form
- Toast notifications via sonner for mutation success/failure
- Edge functions return structured error responses with CORS headers

## Cross-Cutting Concerns

**Logging:** Console.error for caught errors, no structured logging in production

**Validation:**
- Form inputs: Zod schemas with zodResolver
- API responses: Zod parse functions in hooks
- Database types: TypeScript types from `src/types/database.types.ts`

**Authentication:**
- Currently: No auth (public access via RLS policies allowing all)
- Supabase: Uses anon key with permissive RLS policies

---

*Architecture analysis: 2026-02-02*
*Updated: 2026-02-04 — Added meetings system*
