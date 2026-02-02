# Phase 3: Unified Form - Research

**Researched:** 2026-02-02
**Domain:** React forms with react-hook-form, zod validation, Supabase persistence
**Confidence:** HIGH

## Summary

Phase 3 requires creating a unified form where authenticated company users submit financials, qualitative scoring, and commentary in one page. The codebase already has all the building blocks:

1. **Existing form patterns:** `company-submit.tsx` handles financial data entry with auto-calculation (EBITDA = GP - Overheads). `scorecard.tsx` has qualitative scoring with radio groups and commentary textareas. Both use react-hook-form with zod validation.

2. **Auth integration ready:** `AuthContext` provides `businessId` from JWT claims. The `ProtectedRoute` component handles access control. New routes for `/company/:businessId/submit` would use the same pattern.

3. **Database schema complete:** The `company_submissions` table already has all required fields including the new Lead KPI columns (`outbound_calls`, `first_orders`) added in migration `20260201_add_lead_kpis.sql`. TypeScript types need updating to include these.

**Primary recommendation:** Create a new `UnifiedSubmitPage` component that merges `company-submit.tsx` financial fields with `scorecard.tsx` qualitative sections, using existing section components where possible.

## Existing Codebase Patterns

### Form Libraries (Already Installed)
| Library | Version | Purpose | Location |
|---------|---------|---------|----------|
| react-hook-form | 7.x | Form state management | All form pages |
| @hookform/resolvers | - | Zod integration | company-submit.tsx, scorecard.tsx |
| zod | 3.x | Schema validation | src/schemas/*.ts |

### Established Form Patterns

**Pattern 1: Financial Input with Prefix**
```typescript
// Source: src/pages/company-submit.tsx (lines 242-270)
<div className="relative mt-1">
  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">£</span>
  <Input
    type="number"
    step="0.01"
    className="pl-7"
    placeholder="0"
    {...form.register('revenueActual')}
  />
</div>
```

**Pattern 2: Auto-Calculation with Manual Override**
```typescript
// Source: src/pages/company-submit.tsx (lines 51-73)
const [netProfitOverride, setNetProfitOverride] = useState(false)

// Auto-calculate Net Profit when not overridden
useEffect(() => {
  if (!netProfitOverride) {
    const gpActual = Number(grossProfitActual) || 0
    const ohActual = Number(overheadsActual) || 0
    form.setValue('netProfitActual', gpActual - ohActual)
    form.setValue('netProfitTarget', gpTarget - ohBudget)
  }
}, [grossProfitActual, overheadsActual, netProfitOverride, form])
```

**Pattern 3: Qualitative Radio Groups**
```typescript
// Source: src/components/sales-section.tsx (lines 38-61)
<Controller
  name="salesExecution"
  control={control}
  render={({ field }) => (
    <RadioGroup
      value={field.value}
      onValueChange={field.onChange}
      className="space-y-2"
    >
      {SALES_OPTIONS.map((option) => (
        <div key={option.value} className="flex items-center space-x-3">
          <RadioGroupItem value={option.value} id={`salesExecution-${option.value}`} />
          <Label htmlFor={`salesExecution-${option.value}`} className="flex-1 cursor-pointer text-sm">
            {option.label}
          </Label>
          <span className="text-muted-foreground text-sm">{option.points} pts</span>
        </div>
      ))}
    </RadioGroup>
  )}
/>
```

**Pattern 4: Month Selection**
```typescript
// Source: src/pages/scorecard.tsx (lines 84-104)
const months = useMemo(() => {
  return Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(startOfMonth(new Date()), i)
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    }
  })
}, [])
```

### UI Components Available
| Component | Location | Used For |
|-----------|----------|----------|
| Input | src/components/ui/input.tsx | Text/number fields |
| Textarea | src/components/ui/textarea.tsx | Commentary |
| Select | src/components/ui/select.tsx | Month picker |
| RadioGroup | src/components/ui/radio-group.tsx | Qualitative scoring |
| Card | src/components/ui/card.tsx | Section containers |
| Label | src/components/ui/label.tsx | Field labels |
| Button | src/components/ui/button.tsx | Submit |

## Database Schema

### Existing `company_submissions` Table
```sql
-- From: supabase/migrations/00000000_full_schema.sql
company_submissions (
  id uuid PRIMARY KEY,
  data_request_id uuid REFERENCES data_requests(id),

  -- Financial fields (FORM-02)
  revenue_actual numeric NOT NULL,
  revenue_target numeric NOT NULL,
  gross_profit_actual numeric NOT NULL,
  gross_profit_target numeric NOT NULL,
  overheads_actual numeric NOT NULL,
  overheads_budget numeric NOT NULL,
  net_profit_actual numeric NOT NULL,  -- EBITDA
  net_profit_target numeric NOT NULL,
  net_profit_override boolean DEFAULT false,
  total_wages numeric NOT NULL,
  productivity_benchmark numeric NOT NULL,

  -- Commentary fields (FORM-05)
  company_biggest_opportunity text,
  company_biggest_risk text,
  company_challenges text,
  company_wins text,

  -- Metadata
  submitted_at timestamptz DEFAULT now(),
  submitted_by_name text,
  submitted_by_email text
)
```

### New Lead KPI Columns (FORM-03)
```sql
-- From: supabase/migrations/20260201_add_lead_kpis.sql
ALTER TABLE company_submissions
ADD COLUMN IF NOT EXISTS outbound_calls integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS first_orders integer DEFAULT NULL;
```

### TypeScript Types Need Update
The `CompanySubmission` type in `src/types/database.types.ts` does NOT include `outbound_calls` and `first_orders`. These need to be added:

```typescript
// Add to company_submissions Row type:
outbound_calls: number | null
first_orders: number | null
```

### Schema for Unified Form
Qualitative scoring options are defined in `src/lib/scoring.ts`:

| Field | Options | Points |
|-------|---------|--------|
| leadership | aligned (10), minor (7), misaligned (3), toxic (0) | 0-10 |
| marketDemand | strong (7.5), flat (5), softening (2.5), decline (0) | 0-7.5 |
| marketing | clear (7.5), activity (5), poor (2.5), none (0) | 0-7.5 |
| productStrength | differentiated (10), adequate (6), weak (3), broken (0) | 0-10 |
| supplierStrength | strong (5), acceptable (3), weak (1), damaging (0) | 0-5 |
| salesExecution | beating (10), onTarget (6), underperforming (3), none (0) | 0-10 |

## Auth Integration

### Getting Company ID
```typescript
// Source: src/contexts/auth-context.tsx
const { businessId, userRole } = useAuth()

// businessId comes from JWT claims (decoded in getJwtClaims)
// - admin users: businessId is null, can access all
// - business_user: businessId is their company's UUID
```

### Route Protection Pattern
```typescript
// Source: src/App.tsx (lines 51-58)
<Route path="/business/:businessId">
  {(params) => (
    <ProtectedRoute allowedBusinessId={params.businessId}>
      <HistoryPage />
    </ProtectedRoute>
  )}
</Route>
```

### RLS Policy Consideration
From Phase 2 decisions: RLS policies use `public.is_admin()` helper function. Business users can only access their own data via `business_id` matching their JWT claim.

## Gap Analysis

### Exists and Ready
| Requirement | Status | Source |
|-------------|--------|--------|
| FORM-02: Financial fields | DONE | company-submit.tsx has all fields |
| FORM-05: Commentary fields | DONE | company-submit.tsx has wins, challenges, opportunity, risk |
| FORM-06: Month selector | DONE | scorecard.tsx has month select pattern |
| FORM-07: EBITDA auto-calc | DONE | company-submit.tsx has override pattern |
| UI components | DONE | shadcn/ui complete set |
| Form validation | DONE | Zod schemas exist |

### Needs Building
| Requirement | Gap | Approach |
|-------------|-----|----------|
| FORM-01: Unified form | New page needed | Combine company-submit + scorecard sections |
| FORM-03: Lead KPIs | Fields exist in DB, not in form | Add outbound_calls, first_orders fields |
| FORM-04: Qualitative scoring | Exists in scorecard.tsx | Move to unified form for company user |
| TypeScript types | Missing Lead KPI types | Update database.types.ts |
| New route | /company/:businessId/submit | Add to App.tsx |
| Submission hook | May need update | Add qualitative fields to mutation |

### Key Architecture Decision

**Current flow (two separate forms):**
1. Company user visits `/submit/:token` (magic link) -> fills financial + commentary
2. Admin creates scorecard at `/business/:id/scorecard` -> enters qualitative scores

**New flow (unified form):**
1. Company user logs in -> visits `/company/:businessId/submit`
2. Fills ALL data: financial + qualitative + commentary
3. Creates `company_submission` record directly

**Critical insight:** The unified form shifts qualitative scoring FROM consultants TO company users. This is a UX change Nick approved. The existing `scorecard.tsx` qualitative sections (RadioGroups) can be reused as components.

## Technical Approach Recommendations

### Recommended Architecture

1. **Create new unified schema** (`src/schemas/unified-submission.ts`)
   - Merge `companySubmissionSchema` + relevant parts of `scorecardSchema`
   - Add Lead KPI validation (positive integers, optional)
   - Keep EBITDA auto-calc logic

2. **Create new page** (`src/pages/company-unified-submit.tsx`)
   - Route: `/company/:businessId/submit`
   - Protected by `ProtectedRoute` with `allowedBusinessId`
   - Layout: Single scrollable form with Card sections

3. **Reuse existing section components**
   - Financial: Adapt `company-submit.tsx` layout
   - Qualitative: Import `PeopleSection`, `MarketSection`, etc.
   - Commentary: Keep same fields as current company-submit

4. **Update submission hook**
   - Extend `useCreateCompanySubmission` to include qualitative fields
   - Store qualitative choices in `company_submissions` table
   - Score calculation happens on save

### Form Sections Order
```
1. Month Selection (FORM-06)
2. Financial Performance (FORM-02)
   - Revenue (actual/target)
   - Gross Profit (actual/target)
   - Overheads (actual/budget)
   - EBITDA (auto-calc with override) (FORM-07)
3. Lead KPIs (FORM-03)
   - Outbound Calls
   - First Orders / New Accounts
4. Qualitative Scoring (FORM-04)
   - Leadership
   - Market Demand
   - Marketing
   - Product
   - Suppliers
   - Sales
5. Commentary (FORM-05)
   - Wins
   - Challenges
   - Biggest Opportunity
   - Biggest Risk
6. Submit Button
```

### Database Changes Required

1. **Add qualitative columns to company_submissions:**
```sql
ALTER TABLE company_submissions
ADD COLUMN leadership text,
ADD COLUMN market_demand text,
ADD COLUMN marketing text,
ADD COLUMN product_strength text,
ADD COLUMN supplier_strength text,
ADD COLUMN sales_execution text;
```

2. **Update TypeScript types** to match schema

## Risks and Mitigations

### Risk 1: Qualitative Options Complexity
**Risk:** Company users may not understand qualitative scoring options designed for consultants.
**Mitigation:**
- Keep same option labels (already clear from `LEADERSHIP_OPTIONS`, etc.)
- Add help text/tooltips if needed
- Consider "Not sure" option (scores as 0)

### Risk 2: Form Length
**Risk:** Unified form may feel too long (target: <10 min completion).
**Mitigation:**
- Use collapsible Card sections
- Show progress indicator
- Pre-fill previous month's qualitative answers as defaults
- Make Lead KPIs optional

### Risk 3: Migration from Token-Based to Auth-Based
**Risk:** Current `company-submit.tsx` uses magic link tokens via `data_requests` table.
**Mitigation:**
- New unified form uses auth (businessId from JWT)
- Keep old magic link flow for backward compatibility
- Migrate gradually - both can coexist

### Risk 4: Score Calculation Timing
**Risk:** When does score calculation happen if company submits qualitative data?
**Mitigation:**
- Calculate and store total_score on submission
- Store in `company_submissions` table (new column needed)
- Or create scorecard record automatically on submission

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state | Custom useState | react-hook-form | Already used, handles validation |
| Validation | Manual checks | Zod schemas | Type-safe, composable |
| Radio groups | HTML radio | shadcn RadioGroup | Accessible, styled |
| Number formatting | Manual format | Intl.NumberFormat | Browser native, locale-aware |

## Code Examples

### Validated Number Input Pattern
```typescript
// Source: src/schemas/company-submission.ts
const positiveMonetaryValue = z.coerce
  .number()
  .min(0, 'Must be a positive number')

// Usage in schema
export const unifiedSubmissionSchema = z.object({
  outboundCalls: z.coerce.number().int().min(0).optional(),
  firstOrders: z.coerce.number().int().min(0).optional(),
  // ... other fields
})
```

### Section Component with Score Display
```typescript
// Source: src/components/financial-section.tsx
<Card>
  <CardHeader className="pb-4">
    <div className="flex items-center justify-between">
      <CardTitle className="text-lg">Financial Performance</CardTitle>
      <div className="text-right">
        <span className="text-xl font-bold">{subtotal}</span>
        <span className="text-muted-foreground"> / 40</span>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    {/* Fields here */}
  </CardContent>
</Card>
```

## Open Questions

1. **Score storage location:**
   - Option A: Add `total_score` column to `company_submissions`
   - Option B: Auto-create `scorecards` record on unified form submit
   - **Recommendation:** Option A for simplicity. Consultants can still create separate scorecard with their commentary later.

2. **Productivity data handling:**
   - Current: Company enters wages + benchmark, productivity calculated
   - Question: Should qualitative scoring happen automatically based on productivity variance?
   - **Recommendation:** Keep explicit qualitative choices. Auto-calc is a future enhancement.

3. **Monthly submission uniqueness:**
   - Current: `data_requests` enforces unique (business_id, month)
   - New flow: How to enforce uniqueness without data_requests?
   - **Recommendation:** Add unique constraint on `company_submissions(business_id, month)` - requires adding `business_id` column or using existing `data_request_id` link.

## Sources

### Primary (HIGH confidence)
- `src/pages/company-submit.tsx` - Full financial form implementation
- `src/pages/scorecard.tsx` - Qualitative scoring implementation
- `src/schemas/company-submission.ts` - Validation schema
- `src/lib/scoring.ts` - Qualitative options and scoring logic
- `supabase/migrations/*.sql` - Database schema

### Secondary (MEDIUM confidence)
- `src/components/*-section.tsx` - Reusable section components
- `src/hooks/use-company-submissions.ts` - Mutation patterns

## Metadata

**Confidence breakdown:**
- Existing patterns: HIGH - Direct codebase analysis
- Database schema: HIGH - Migration files reviewed
- Auth integration: HIGH - Context and routes analyzed
- Gap analysis: HIGH - Requirements mapped to codebase

**Research date:** 2026-02-02
**Valid until:** 2026-02-09 (stable codebase, no external dependencies)
