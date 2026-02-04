# Chester Authentication System

Last updated: 2026-02-04

## Overview

Chester uses Supabase Auth with a **custom JWT claims hook** to add role-based access control. The system supports three user types:

| Role | Access | Redirect After Login |
|------|--------|---------------------|
| `super_admin` | Full access to all features | `/` (admin dashboard) |
| `consultant` | Read-only admin access (can't edit financials) | `/` (admin dashboard) |
| `business_user` | Access to their own business data only | `/company/dashboard` |

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────────┐
│  Login Page     │────▶│  Supabase Auth                   │
│  /login         │     │  signInWithPassword()            │
└─────────────────┘     └──────────────────────────────────┘
                                      │
                                      ▼
                        ┌──────────────────────────────────┐
                        │  custom_access_token_hook()      │
                        │  - Checks admins table           │
                        │  - Checks company_emails table   │
                        │  - Checks businesses table       │
                        │  - Adds user_role & business_id  │
                        │    to JWT claims                 │
                        └──────────────────────────────────┘
                                      │
                                      ▼
                        ┌──────────────────────────────────┐
                        │  Frontend receives JWT with:     │
                        │  - user_role: string             │
                        │  - business_id: uuid | null      │
                        └──────────────────────────────────┘
                                      │
                                      ▼
                        ┌──────────────────────────────────┐
                        │  auth-context.tsx parses JWT     │
                        │  login-form.tsx redirects        │
                        │  protected-route.tsx enforces    │
                        └──────────────────────────────────┘
```

## Key Files

### Frontend

| File | Purpose |
|------|---------|
| `src/contexts/auth-context.tsx` | Parses JWT claims, provides `userRole` and `businessId` |
| `src/components/auth/login-form.tsx` | Unified login form with role-based redirect |
| `src/components/auth/protected-route.tsx` | Route guard that checks roles |
| `src/pages/login.tsx` | Login page (all users use this) |

### Backend (Supabase)

| File | Purpose |
|------|---------|
| `supabase/migrations/20260202_add_auth_schema.sql` | Original auth hook |
| `supabase/migrations/20260203_add_company_emails.sql` | Multi-email support, updated hook |
| `supabase/migrations/20260203_add_consultant_role.sql` | Consultant role support |
| `supabase/migrations/20260204_fix_auth_hook_security.sql` | **CRITICAL** - SECURITY DEFINER fix |

## How User Role is Determined

The `custom_access_token_hook` function checks in this order:

1. **Is email in `admins` table?** → Returns role from admins record (`super_admin` or `consultant`)
2. **Is email in `company_emails` table?** → Returns `business_user` with that business_id
3. **Is email in `businesses.contact_email`?** → Returns `business_user` (legacy fallback)
4. **Is auth user_id in `businesses.auth_user_id`?** → Returns `business_user` (legacy fallback)
5. **None of the above** → Returns `null` role (user sees error, gets signed out)

## Critical Configuration

### Supabase Dashboard Settings

**Authentication > Hooks > Custom Access Token (JWT Claims)**
- Must be **ENABLED**
- Must point to: `public.custom_access_token_hook`

### Function Requirements

The hook function MUST have:
```sql
ALTER FUNCTION public.custom_access_token_hook(jsonb) SECURITY DEFINER;
```

**Why?** The hook runs as `supabase_auth_admin` role. Without `SECURITY DEFINER`, RLS policies block the hook from reading the `admins`, `company_emails`, and `businesses` tables. This causes the JWT to have `null` claims, and users can't log in properly.

### Required Table Permissions

```sql
GRANT SELECT ON public.company_emails TO supabase_auth_admin;
GRANT SELECT ON public.businesses TO supabase_auth_admin;
GRANT SELECT ON public.admins TO supabase_auth_admin;
```

## Troubleshooting

### User logs in but nothing happens / stays on login page

**Symptom:** Console shows `[Auth] JWT decoded claims: {user_role: null, business_id: null}`

**Cause:** The auth hook isn't adding claims to the JWT.

**Check:**
1. Is the hook enabled in Supabase Dashboard? (Authentication > Hooks)
2. Is the function `SECURITY DEFINER`? Run:
   ```sql
   SELECT prosecdef FROM pg_proc WHERE proname = 'custom_access_token_hook';
   -- Should return: true
   ```
3. Does `supabase_auth_admin` have SELECT on required tables?
   ```sql
   SELECT grantee, table_name FROM information_schema.table_privileges
   WHERE grantee = 'supabase_auth_admin' AND table_schema = 'public';
   ```

**Fix:** Run migration `20260204_fix_auth_hook_security.sql` or manually:
```sql
ALTER FUNCTION public.custom_access_token_hook(jsonb) SECURITY DEFINER;
GRANT SELECT ON public.company_emails TO supabase_auth_admin;
GRANT SELECT ON public.businesses TO supabase_auth_admin;
GRANT SELECT ON public.admins TO supabase_auth_admin;
```

### User gets "Your account is not configured correctly"

**Cause:** User's email is not in `admins`, `company_emails`, or `businesses.contact_email`.

**Fix:** Add their email to the appropriate table:
- For admin access: Insert into `admins` table
- For business access: Insert into `company_emails` table

### User redirected to /unauthorized

**Cause:** User has a role but is trying to access a route they don't have permission for.

**Check:** The `protected-route.tsx` logic for that route's `requiredRole` prop.

## Adding New Users

### Admin Users
```sql
INSERT INTO admins (email, role) VALUES ('user@example.com', 'super_admin');
```
Then create their Supabase auth account (via invitation or signup).

### Business Users
```sql
INSERT INTO company_emails (business_id, email)
VALUES ('uuid-of-business', 'user@example.com');
```
Then create their Supabase auth account (via invitation or signup).

## Testing the Auth Hook

You can test the hook directly:
```sql
SELECT public.custom_access_token_hook('{
  "claims": {
    "email": "test@example.com",
    "sub": "00000000-0000-0000-0000-000000000000"
  }
}'::jsonb);
```

## Unified Login Flow

As of 2026-02-04, there is ONE login page at `/login` for all user types:
- Old `/company/login` URL redirects to `/login`
- After login, users are redirected based on their role
- Business users go to `/company/dashboard`
- Admins/consultants go to `/` (portfolio dashboard)
