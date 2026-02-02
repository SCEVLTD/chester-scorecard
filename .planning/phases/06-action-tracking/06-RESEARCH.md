# Phase 6: Action Tracking - Research

**Researched:** 2026-02-02
**Domain:** Action/Task tracking in business applications
**Confidence:** HIGH

## Summary

Action tracking is a standard CRUD feature in business applications where actions/tasks are created during meetings and tracked until completion. The research focused on database schema design, React form patterns with validation, and common implementation pitfalls.

The standard approach uses a simple relational database schema with actions linked to business entities, status tracking, and assignment to owners with due dates. Modern implementations leverage React Hook Form with Zod for type-safe validation, TanStack Query for server state management, and shadcn/ui components for consistent UI.

Key findings indicate that 44% of action items from meetings never get completed due to vague descriptions, missing deadlines, or poor follow-through. Best practices emphasize single ownership, clear action descriptions starting with verbs, and proper RLS policies to control data access.

**Primary recommendation:** Use existing codebase patterns (React Hook Form + Zod + TanStack Query) with a simple actions table linked to businesses, focusing on single ownership and clear completion tracking.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | ^7.71.1 | Form state management | Industry standard, minimal re-renders, native validation |
| zod | ^4.3.6 | Schema validation | Type-safe runtime validation matching TypeScript |
| @hookform/resolvers | ^5.2.2 | Zod integration | Connects Zod validation to React Hook Form |
| @tanstack/react-query | ^5.90.20 | Server state | Automatic caching, invalidation, mutations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-dialog | ^1.1.15 | Modal/Dialog primitives | Creating/editing actions in modals |
| lucide-react | ^0.563.0 | Icons | Status indicators, action buttons |
| sonner | ^2.0.7 | Toast notifications | Success/error feedback |
| date-fns | ^4.1.0 | Date handling | Due date formatting, validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Hook Form | Formik | Formik has more re-renders, larger bundle |
| Zod | Yup | Yup lacks TypeScript inference |
| TanStack Query | SWR | SWR has less mutation support |

**Installation:**
Already installed in the project - no new dependencies needed.

## Architecture Patterns

### Recommended Database Structure
```sql
-- Actions table linked to businesses
CREATE TABLE IF NOT EXISTS actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  description text NOT NULL,
  owner text NOT NULL,              -- Single person responsible
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'complete')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_by text                   -- Consultant who created it
);

-- Index for efficient business queries
CREATE INDEX idx_actions_business_status ON actions(business_id, status);
CREATE INDEX idx_actions_due_date ON actions(due_date) WHERE status = 'pending';
```

### Pattern 1: Mutation Hook with Cache Invalidation
**What:** TanStack Query mutation that updates server and invalidates cache
**When to use:** All create/update/delete operations
**Example:**
```typescript
// Source: Existing codebase pattern (use-data-requests.ts)
export function useCreateAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ActionInsert) => {
      const { data: result, error } = await supabase
        .from('actions')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (data) => {
      // Invalidate both business-specific and all-actions queries
      queryClient.invalidateQueries({ queryKey: ['actions', data.business_id] })
      queryClient.invalidateQueries({ queryKey: ['actions'] })
    },
  })
}
```

### Pattern 2: Form with Zod Schema
**What:** Type-safe form validation with runtime checking
**When to use:** All forms (create/edit actions)
**Example:**
```typescript
// Source: React Hook Form with Zod Complete Guide 2026
// Schema definition
export const actionSchema = z.object({
  description: z.string().trim().min(1, 'Action description required'),
  owner: z.string().trim().min(1, 'Owner required'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
})

export type ActionFormData = z.infer<typeof actionSchema>

// Form component
const form = useForm<ActionFormData>({
  resolver: zodResolver(actionSchema),
  defaultValues: {
    description: '',
    owner: '',
    due_date: new Date().toISOString().split('T')[0],
  },
})
```

### Pattern 3: RLS Policy for Business-Scoped Data
**What:** Row-level security following existing project pattern
**When to use:** All tables with business_id foreign key
**Example:**
```sql
-- Source: Existing 20260202_add_rls_policies.sql
-- Enable RLS
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admin can view all actions" ON actions
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin can insert actions" ON actions
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update actions" ON actions
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admin can delete actions" ON actions
  FOR DELETE USING (public.is_admin());

-- Business users can only see their own
CREATE POLICY "Business user can view own actions" ON actions
  FOR SELECT USING (business_id = public.get_my_business_id());
```

### Pattern 4: Dialog Form with State Management
**What:** Modal dialog containing form with proper reset on close
**When to use:** Creating/editing entities without page navigation
**Example:**
```typescript
// Source: Existing request-data-modal.tsx pattern
export function ActionModal({ businessId, open, onOpenChange }) {
  const createAction = useCreateAction()

  const form = useForm<ActionFormData>({
    resolver: zodResolver(actionSchema),
    defaultValues: { /* ... */ },
  })

  const onSubmit = async (data: ActionFormData) => {
    try {
      await createAction.mutateAsync({ business_id: businessId, ...data })
      toast.success('Action created!')
      handleClose()
    } catch (error) {
      toast.error('Failed to create action')
    }
  }

  const handleClose = () => {
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Form fields */}
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

### Anti-Patterns to Avoid
- **Multiple owners per action:** Dilutes responsibility. Studies show single ownership increases completion rates. Use one owner field, not a many-to-many relationship.
- **Complex status workflows:** Keep it simple (pending/complete). Advanced workflows like "in-progress", "blocked", "review" add complexity for minimal value in v1.
- **Optimistic updates for simple CRUD:** Unnecessary complexity. Standard mutations with loading states are sufficient for non-critical actions.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation logic | Zod + react-hook-form | Type inference, runtime validation, automatic error handling |
| Date picker | Custom date input | Native HTML `<input type="date">` | Built-in validation, mobile-friendly, accessible |
| Server state caching | useState + useEffect | TanStack Query | Handles caching, deduplication, refetching, invalidation |
| Toast notifications | Custom notification system | sonner (already installed) | Accessible, customizable, handles queuing |
| Dialog accessibility | Custom modal | Radix Dialog (already installed) | Focus trap, ESC handling, ARIA attributes |

**Key insight:** The codebase already has all necessary patterns established. Don't introduce new libraries or patterns - follow existing conventions for consistency and maintainability.

## Common Pitfalls

### Pitfall 1: Vague Action Descriptions
**What goes wrong:** Actions like "Follow up" or "Check on this" create confusion and delays. 44% of action items never get completed, often due to unclear descriptions.
**Why it happens:** Rushed meeting notes, assuming context is obvious
**How to avoid:** Validate descriptions start with action verbs. Consider minimum length (20 characters) or prompt for specifics.
**Warning signs:** Actions sitting in "pending" for weeks, follow-up questions from owners

### Pitfall 2: Missing or Unrealistic Deadlines
**What goes wrong:** Actions without due dates get pushed indefinitely. Unrealistic deadlines lead to shortcuts or missed deadlines.
**Why it happens:** Not discussing timeline during meeting, optimistic planning
**How to avoid:** Make due_date required in schema. Display overdue count prominently on dashboard.
**Warning signs:** Many actions with past due dates still pending

### Pitfall 3: RLS Not Enabled on New Tables
**What goes wrong:** 83% of exposed Supabase databases involve RLS misconfigurations. CVE-2025-48757 affected 170+ apps that forgot to enable RLS.
**Why it happens:** RLS is disabled by default when creating tables. Developers forget the two-step process: enable RLS, then create policies.
**How to avoid:** Immediately after CREATE TABLE, add "ALTER TABLE actions ENABLE ROW LEVEL SECURITY". Create policies before inserting any data.
**Warning signs:** Supabase dashboard shows warning icon on tables, security advisors flag table

### Pitfall 4: No Cache Invalidation After Mutations
**What goes wrong:** Dashboard shows stale data after creating/completing actions. Users refresh page manually.
**Why it happens:** Forgetting queryClient.invalidateQueries in mutation onSuccess
**How to avoid:** Follow existing pattern: invalidate both specific and broad queries. Test by creating action and checking if dashboard updates without refresh.
**Warning signs:** Need to refresh page to see changes, users report "not updating"

### Pitfall 5: Portal Forms Breaking Validation Display
**What goes wrong:** Dialog components render via React portal outside form DOM tree, causing validation errors to not display properly.
**Why it happens:** Dialog content is portaled to document.body, breaking form context
**How to avoid:** Keep form state in component wrapping Dialog, pass validation state as props, or use controlled Dialog open state to reset form on close.
**Warning signs:** Form submits with invalid data, error messages don't appear

### Pitfall 6: Completing Actions Without Timestamp
**What goes wrong:** Can't track when actions were completed, can't calculate completion time metrics
**Why it happens:** Only updating status field, not tracking timestamp
**How to avoid:** Update both status and completed_at in same mutation. Consider database trigger to auto-set completed_at when status changes to 'complete'.
**Warning signs:** Completed actions show "unknown completion date"

## Code Examples

Verified patterns from official sources and existing codebase:

### Creating an Action
```typescript
// Hook: src/hooks/use-actions.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useCreateAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      business_id: string
      description: string
      owner: string
      due_date: string
      created_by?: string
    }) => {
      const { data: result, error } = await supabase
        .from('actions')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['actions', data.business_id] })
      queryClient.invalidateQueries({ queryKey: ['actions', 'pending'] })
    },
  })
}
```

### Fetching Pending Actions
```typescript
// Hook: src/hooks/use-actions.ts
export function useBusinessPendingActions(businessId: string) {
  return useQuery({
    queryKey: ['actions', businessId, 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('actions')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'pending')
        .order('due_date', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!businessId,
  })
}
```

### Completing an Action
```typescript
// Hook: src/hooks/use-actions.ts
export function useCompleteAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (actionId: string) => {
      const { data, error } = await supabase
        .from('actions')
        .update({
          status: 'complete',
          completed_at: new Date().toISOString()
        })
        .eq('id', actionId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['actions', data.business_id] })
      queryClient.invalidateQueries({ queryKey: ['actions', 'pending'] })
    },
  })
}
```

### Form Component
```typescript
// Component: src/components/add-action-modal.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { actionSchema, type ActionFormData } from '@/schemas/action'

export function AddActionModal({ businessId, open, onOpenChange }) {
  const createAction = useCreateAction()

  const form = useForm<ActionFormData>({
    resolver: zodResolver(actionSchema),
    defaultValues: {
      description: '',
      owner: '',
      due_date: new Date().toISOString().split('T')[0],
    },
  })

  const onSubmit = async (data: ActionFormData) => {
    try {
      await createAction.mutateAsync({
        business_id: businessId,
        ...data
      })
      toast.success('Action created successfully')
      handleClose()
    } catch (error) {
      toast.error('Failed to create action')
    }
  }

  const handleClose = () => {
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Action Item</DialogTitle>
          <DialogDescription>
            Create a new action to track from the Friday meeting.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Action Description</label>
            <Textarea
              placeholder="e.g., Review Q1 forecast with finance team"
              {...form.register('description')}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-500">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Owner</label>
            <Input
              placeholder="Person responsible"
              {...form.register('owner')}
            />
            {form.formState.errors.owner && (
              <p className="text-sm text-red-500">
                {form.formState.errors.owner.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Due Date</label>
            <Input
              type="date"
              {...form.register('due_date')}
            />
            {form.formState.errors.due_date && (
              <p className="text-sm text-red-500">
                {form.formState.errors.due_date.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createAction.isPending}>
              {createAction.isPending ? 'Creating...' : 'Create Action'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

### Dashboard Display
```typescript
// Component: src/components/pending-actions-badge.tsx
export function PendingActionsBadge({ businessId }: { businessId: string }) {
  const { data: actions, isLoading } = useBusinessPendingActions(businessId)

  if (isLoading) return <Skeleton className="h-5 w-8" />
  if (!actions || actions.length === 0) return null

  const overdueCount = actions.filter(a =>
    new Date(a.due_date) < new Date()
  ).length

  return (
    <Badge variant={overdueCount > 0 ? "destructive" : "secondary"}>
      {actions.length} pending
    </Badge>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate form libraries | React Hook Form + Zod integration | 2023-2024 | Type safety, smaller bundles, better DX |
| Manual cache management | TanStack Query auto-invalidation | 2022+ | Less boilerplate, fewer bugs |
| Custom modal implementations | Radix primitives with shadcn/ui | 2023+ | Accessibility built-in, consistent patterns |
| AI auto-capture from meetings | Mature in 2026 | 2025-2026 | Reduces manual entry, but still needs review |

**Deprecated/outdated:**
- Formik: Replaced by React Hook Form (smaller, faster, better TypeScript)
- Redux for form state: Overkill for forms, use React Hook Form
- Yup validation: Zod has better TypeScript inference
- Custom date pickers: Native input type="date" is now well-supported

## Open Questions

1. **Should actions support recurring tasks?**
   - What we know: Not mentioned in requirements, adds complexity
   - What's unclear: Do Friday meetings generate same actions repeatedly?
   - Recommendation: Ship v1 without recurrence. Can add later if needed.

2. **Should actions have priority levels?**
   - What we know: Not in requirements, adds UI complexity
   - What's unclear: Would consultants use priority if available?
   - Recommendation: Skip for v1. Due date provides urgency signal. Add if requested.

3. **Should completed actions be archived or soft-deleted?**
   - What we know: Valuable for reporting/audit trail
   - What's unclear: How long to retain completed actions
   - Recommendation: Keep all completed actions, add filter to hide them. No automatic deletion.

4. **Integration with external task systems?**
   - What we know: 2026 trend toward unified systems
   - What's unclear: Do businesses use external task trackers?
   - Recommendation: v1 is standalone. Could add export later if requested.

## Sources

### Primary (HIGH confidence)
- Existing codebase patterns (.planning/phases/06-action-tracking research)
- [TanStack Query v5 Mutations Documentation](https://tanstack.com/query/v5/docs/react/guides/mutations)
- [TanStack Query Optimistic Updates](https://tanstack.com/query/v5/docs/react/guides/optimistic-updates)
- [Supabase Row Level Security Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [shadcn/ui Dialog Component](https://ui.shadcn.com/docs/components/dialog)

### Secondary (MEDIUM confidence)
- [React Hook Form with Zod Complete Guide 2026](https://dev.to/marufrahmanlive/react-hook-form-with-zod-complete-guide-for-2026-1em1) - Verified against official docs
- [Supabase RLS Complete Guide 2026](https://vibeappscanner.com/supabase-row-level-security) - Verified with official Supabase docs
- [Guide To Design Database For Task Manager](https://mysql.tutorials24x7.com/blog/guide-to-design-database-for-task-manager-in-mysql) - General schema patterns

### Tertiary (LOW confidence - context only)
- [How to Manage Meeting Action Items 2026](https://fellow.ai/blog/how-to-manage-meeting-tasks-and-action-items/) - General best practices
- [Action Item Tracking for Agencies](https://www.scribbl.co/post/action-item-tracking) - Business context
- [Shopify Action Items Guide 2026](https://www.shopify.com/blog/action-items) - General guidance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, versions verified from package.json
- Architecture: HIGH - Patterns extracted from existing codebase (use-data-requests.ts, RLS policies)
- Pitfalls: MEDIUM - Mix of official documentation (RLS) and industry research (completion rates)

**Research date:** 2026-02-02
**Valid until:** 2026-03-04 (30 days - stable domain)
