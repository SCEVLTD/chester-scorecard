---
phase: 10-consultant-view-reporting
plan: 01
subsystem: authentication-and-authorization
tags: [rbac, consultant-role, jwt, auth, ui-filtering]
requires: [08-super-admin-mgmt]
provides: [three-tier-access-control, consultant-role-implementation]
affects: [future-financial-reporting, row-level-security]
tech-stack:
  added: []
  patterns: [role-based-access-control, jwt-custom-claims, backward-compatibility]
key-files:
  created:
    - supabase/migrations/20260203_add_consultant_role.sql
  modified:
    - src/types/database.types.ts
    - src/contexts/auth-context.tsx
    - src/pages/portfolio.tsx
    - src/components/business-scorecard-view.tsx
    - src/components/auth/protected-route.tsx
    - src/pages/unauthorized.tsx
decisions:
  - id: ROLE-01
    what: Role terminology
    chosen: super_admin and consultant (not admin_full and admin_limited)
    why: Clear semantic meaning, follows industry standards
  - id: ROLE-02
    what: Backward compatibility for old 'admin' JWT claims
    chosen: Map 'admin' to 'super_admin' in auth context
    why: Smooth transition for existing sessions, no forced re-login
  - id: ROLE-03
    what: Consultant UI permissions
    chosen: Both super_admin and consultant can access admin UI features
    why: Consultants need to manage invitations and edit companies for their job
  - id: ROLE-04
    what: Financial data access control
    chosen: UI filtering for now, RLS later
    why: Faster implementation, security enforced at query level is future enhancement
metrics:
  duration: 393 seconds
  completed: 2026-02-03
---

# Phase 10 Plan 01: Consultant Role Implementation Summary

**One-liner:** Three-tier access control (Super Admin / Consultant / Business) with consultants seeing qualitative data but not financials.

## What Was Delivered

Implemented consultant role that allows Dylan and Nick (Velocity Growth consultants) to:
- See all business scorecards with scores, AI summaries, and heat maps
- Access admin UI features (bulk invitations, company editing)
- NOT see raw financial figures (revenue, profit, variances)

This maintains confidentiality while enabling consultants to facilitate meetings effectively.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add role column to admins table and update JWT hook | 968333f | supabase/migrations/20260203_add_consultant_role.sql |
| 2 | Update TypeScript types and auth context | 95d1d66 | src/types/database.types.ts, src/contexts/auth-context.tsx |
| 3 | Add consultant role UI filtering | 0292332 | src/pages/portfolio.tsx, src/components/business-scorecard-view.tsx, src/components/auth/protected-route.tsx, src/pages/unauthorized.tsx |

## Technical Implementation

### Database Layer
```sql
ALTER TABLE public.admins
ADD COLUMN role text NOT NULL DEFAULT 'super_admin'
CHECK (role IN ('super_admin', 'consultant'));

INSERT INTO public.admins (email, role) VALUES
  ('dylan@velocitygrowth.co.uk', 'consultant'),
  ('nick@velocitygrowth.co.uk', 'consultant');
```

### JWT Hook Update
Changed from returning generic `'admin'` to returning actual role from admins table:
```sql
claims := jsonb_set(claims, '{user_role}', to_jsonb(admin_record.role))
```

### TypeScript Types
```typescript
export type AdminRole = 'super_admin' | 'consultant'
export type UserRole = AdminRole | 'business_user' | null
```

### Backward Compatibility
Auth context maps old 'admin' JWT claims to 'super_admin':
```typescript
const rawRole = decoded.user_role || null
const user_role = rawRole === 'admin' ? 'super_admin' : rawRole
```

### UI Filtering Pattern
```typescript
const isAdminRole = userRole === 'super_admin' || userRole === 'consultant'

{isAdminRole && (
  <BulkInvitationPanel />
)}
```

## Decisions Made

**ROLE-01: Role terminology**
- Chosen: `super_admin` and `consultant` (not `admin_full` and `admin_limited`)
- Why: Clear semantic meaning, follows industry standards

**ROLE-02: Backward compatibility**
- Chosen: Map old 'admin' to 'super_admin' in auth context
- Why: Smooth transition for existing sessions, no forced re-login

**ROLE-03: Consultant UI permissions**
- Chosen: Both super_admin and consultant can access admin UI features
- Why: Consultants need to manage invitations and edit companies

**ROLE-04: Financial data access control**
- Chosen: UI filtering for now, RLS later
- Why: Faster implementation, security at query level is future enhancement

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TypeScript errors after role change**
- **Found during:** Task 3
- **Issue:** Components checking `userRole === 'admin'` caused TS errors after role type change
- **Fix:** Updated ProtectedRoute, unauthorized page with isAdminRole helper
- **Files modified:** protected-route.tsx, unauthorized.tsx
- **Commit:** 0292332

**2. [Rule 2 - Missing Critical] ProtectedRoute didn't support new roles**
- **Found during:** Build verification
- **Issue:** ProtectedRoute interface only allowed 'admin' | 'business_user'
- **Fix:** Added 'super_admin' | 'consultant' to interface, added role-specific checks
- **Files modified:** protected-route.tsx
- **Commit:** 0292332

## What Consultants Can See

**Visible:**
- Business scorecards with total scores and RAG status
- Section scores (Finance, People, Market, Product, Suppliers, Sales)
- AI-generated analysis and summaries
- Heat maps showing business health
- Qualitative commentary (opportunities, risks, challenges, wins)
- Actions and pending items

**Hidden:**
- Raw financial figures (revenue actual, revenue target)
- Profit figures (gross profit, net profit, EBITDA)
- Financial variances (%, actual amounts)
- Overheads and wages data

## Security Note

Current implementation uses UI filtering. Financial data is still technically accessible in API responses. Future enhancement will add Row-Level Security (RLS) policies to enforce data access at the database query level.

For v1.1 Friday launch, UI filtering is sufficient because:
1. Consultants are trusted partners (Dylan and Nick from Velocity Growth)
2. RLS is planned for v1.2
3. Faster delivery enables Friday meeting preparation

## Testing Checklist

Before deployment:
- [ ] Run migration: `supabase db push`
- [ ] Test Dylan login: dylan@velocitygrowth.co.uk
- [ ] Test Nick login: nick@velocitygrowth.co.uk
- [ ] Verify consultants see scorecards and AI summaries
- [ ] Verify consultants do NOT see financial input forms
- [ ] Test Shane login still works as super_admin
- [ ] Verify super_admin can still create scorecards
- [ ] Check portfolio page loads for all roles

## Next Phase Readiness

**Ready for Phase 10-02:** Portfolio-level actions
- Consultant role established
- Both super_admin and consultant can create portfolio-level actions
- Action visibility is role-agnostic (all admins see all actions)

**No blockers identified.**
