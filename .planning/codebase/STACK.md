# Technology Stack

**Analysis Date:** 2026-02-02

## Languages

**Primary:**
- TypeScript ~5.9.3 - All application code (frontend and Supabase Edge Functions)

**Secondary:**
- SQL - Database migrations in `supabase/migrations/`
- CSS - Tailwind utility classes in `src/index.css`

## Runtime

**Environment:**
- Node.js 20 (specified in `.nvmrc`)
- Deno - Supabase Edge Functions runtime

**Package Manager:**
- npm (package-lock.json present)
- Lockfile: present

## Frameworks

**Core:**
- React 19.2.0 - UI framework
- Vite 7.2.4 - Build tool and dev server
- Tailwind CSS 4.1.18 - Utility-first styling (via @tailwindcss/vite plugin)

**Testing:**
- Vitest 4.0.18 - Test runner
- Testing Library React 16.3.2 - Component testing
- jsdom 27.4.0 - DOM environment for tests

**Build/Dev:**
- TypeScript ~5.9.3 - Type checking
- ESLint 9.39.1 - Linting with typescript-eslint, react-hooks, and react-refresh plugins
- @vitejs/plugin-react 5.1.1 - React fast refresh

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.91.1 - Database client and Edge Function invocation
- `@tanstack/react-query` 5.90.20 - Server state management with caching
- `wouter` 3.9.0 - Lightweight client-side routing
- `zod` 4.3.6 - Schema validation for forms and API responses
- `react-hook-form` 7.71.1 - Form state management

**UI Components:**
- `@radix-ui/*` - Headless UI primitives (dialog, select, tabs, radio-group, label, slot)
- `lucide-react` 0.563.0 - Icon library
- `class-variance-authority` 0.7.1 - Component variant styling (shadcn/ui pattern)
- `clsx` 2.1.1 + `tailwind-merge` 3.4.0 - Conditional class composition

**Data/Visualization:**
- `recharts` 3.7.0 - Charting library (Line, Bar charts)
- `@react-pdf/renderer` 4.3.2 - PDF generation for scorecard exports
- `excel-builder-vanilla` 4.2.1 - Excel export functionality
- `date-fns` 4.1.0 - Date manipulation

**Notifications:**
- `sonner` 2.0.7 - Toast notifications

**Dev Tools:**
- `@tanstack/react-query-devtools` 5.91.2 - Query debugging in development

## Configuration

**Environment:**
- `.env.local` for local development
- Required vars:
  - `VITE_SUPABASE_URL` - Supabase project URL
  - `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key

**TypeScript:**
- `tsconfig.json` - Project references to app and node configs
- `tsconfig.app.json` - ES2022 target, strict mode, bundler resolution, path alias `@/*` -> `./src/*`
- `tsconfig.node.json` - Node-specific config for tooling

**Build:**
- `vite.config.ts` - React plugin, Tailwind plugin, path alias
- `eslint.config.js` - Flat config with recommended rules

**shadcn/ui:**
- `components.json` - Default style, slate base color, CSS variables enabled
- Components aliased to `@/components/ui`

## Platform Requirements

**Development:**
- Node.js 20+
- npm
- Supabase CLI (for Edge Function development)

**Production:**
- Vercel (configured via `vercel.json` with SPA rewrites)
- Supabase hosted database and Edge Functions

## Scripts

```bash
npm run dev           # Start Vite dev server
npm run build         # TypeScript check + Vite production build
npm run lint          # ESLint
npm run preview       # Preview production build
npm run test          # Vitest watch mode
npm run test:run      # Vitest single run
npm run test:coverage # Vitest with v8 coverage
```

---

*Stack analysis: 2026-02-02*
