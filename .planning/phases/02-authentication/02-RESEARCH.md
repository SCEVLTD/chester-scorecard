# Phase 2: Authentication - Research

**Researched:** 2026-02-02
**Domain:** Supabase Auth + Row Level Security for multi-tenant React app
**Confidence:** HIGH

## Summary

This phase implements secure authentication for the Chester Business Scorecard, enabling businesses to log in and see only their own data while Chester admins see the entire portfolio. The codebase currently has **no authentication** - all data is publicly accessible via Supabase with permissive RLS policies (`USING (true)`).

The standard approach is:
1. **Supabase Auth** for email/password login with session management
2. **Custom claims via Auth Hook** to store user role (admin vs business_user) in JWT
3. **Row Level Security policies** that check `auth.uid()` and custom role claims
4. **React AuthContext** for client-side session state and protected routes

**Primary recommendation:** Implement Supabase Auth with a `profiles` table linking users to businesses, add an Auth Hook to include role in JWT, then replace all permissive RLS policies with role-based policies.

## Current State Analysis

### Existing Authentication: None

The codebase has **zero authentication**:

```typescript
// src/lib/supabase.ts - Current state
export const supabase = createClient<Database>(supabaseUrl, supabaseKey)
// No auth session handling, no user context
```

### Current RLS Policies: Permissive (Insecure)

From `supabase/migrations/00000000_full_schema.sql`:
```sql
-- Current state - ALL data is public
CREATE POLICY "Allow all access to sectors" ON sectors FOR ALL USING (true);
CREATE POLICY "Allow all access to businesses" ON businesses FOR ALL USING (true);
CREATE POLICY "Allow all access to scorecards" ON scorecards FOR ALL USING (true);
CREATE POLICY "Allow all access to data_requests" ON data_requests FOR ALL USING (true);
CREATE POLICY "Allow all access to company_submissions" ON company_submissions FOR ALL USING (true);
```

### Current Route Structure (All Unprotected)

From `src/App.tsx`:
```typescript
// Admin routes (should require Chester admin role)
<Route path="/" component={HomePage} />              // List all businesses
<Route path="/portfolio" component={PortfolioPage} />  // Portfolio overview
<Route path="/compare" component={ComparePage} />      // Compare businesses

// Business-specific routes (should require business user or admin)
<Route path="/business/:businessId" component={HistoryPage} />
<Route path="/business/:businessId/charts" component={ChartsPage} />
<Route path="/business/:businessId/scorecard" component={ScorecardPage} />

// Public routes (token-based, keep public)
<Route path="/submit/:token" component={CompanySubmitPage} />
<Route path="/submit/:token/success" component={SubmissionSuccessPage} />
```

### Database Schema: No User/Profile Tables

Current tables: `businesses`, `scorecards`, `sectors`, `data_requests`, `company_submissions`

**Missing:**
- `profiles` table (links auth.users to businesses)
- `user_roles` table or role in profiles
- No way to associate a user with a business

## Standard Stack

### Core Authentication
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.91.1 | Auth client (already installed) | Built-in auth, RLS integration |
| Supabase Auth | N/A | Server-side auth | JWT sessions, email/password |

### Supporting (Optional)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/auth-ui-react | ^0.4.x | Pre-built login UI | If you want drop-in components |
| jwt-decode | ^4.x | Decode JWT client-side | If you need to read custom claims in JS |

**Recommendation:** Do NOT add new libraries. The existing `@supabase/supabase-js` handles everything needed.

### Installation

No new packages needed:
```bash
# Already installed
npm list @supabase/supabase-js
# @supabase/supabase-js@2.91.1
```

## Database Schema Design

### Required New Tables

```sql
-- 1. Profiles table: Links auth.users to businesses
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'business_user' CHECK (role IN ('admin', 'business_user')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Auth Hook for Custom Claims (Role in JWT)

```sql
-- Creates a function that adds role to JWT
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE
  claims JSONB;
  user_role TEXT;
  user_business_id UUID;
BEGIN
  -- Get role and business_id from profiles
  SELECT role, business_id INTO user_role, user_business_id
  FROM public.profiles
  WHERE id = (event->>'user_id')::UUID;

  claims := event->'claims';

  -- Add role to claims
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"business_user"');
  END IF;

  -- Add business_id to claims
  IF user_business_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{business_id}', to_jsonb(user_business_id));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Grant execute to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
```

**Important:** Auth Hook must be enabled in Supabase Dashboard: Authentication > Hooks (Beta) > Custom Access Token.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   └── supabase.ts          # Supabase client (existing)
├── contexts/
│   └── auth-context.tsx     # NEW: Auth state provider
├── hooks/
│   └── use-auth.ts          # NEW: Auth hook
├── components/
│   ├── auth/
│   │   ├── login-form.tsx   # NEW: Login UI
│   │   └── protected-route.tsx  # NEW: Route guard
│   └── ...existing
├── pages/
│   ├── login.tsx            # NEW: Login page
│   └── ...existing
└── App.tsx                  # Add AuthProvider wrapper
```

### Pattern 1: AuthContext Provider

**What:** Centralized auth state management via React Context
**When to use:** Always - required for sharing session across components

```typescript
// src/contexts/auth-context.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  session: Session | null
  user: User | null
  userRole: 'admin' | 'business_user' | null
  businessId: string | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Extract custom claims from JWT
  const userRole = session?.user?.app_metadata?.user_role as 'admin' | 'business_user' | null
  const businessId = session?.user?.app_metadata?.business_id as string | null

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      userRole,
      businessId,
      isLoading,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

### Pattern 2: Protected Route Component

**What:** Route wrapper that redirects unauthenticated users
**When to use:** Wrap any route that requires login

```typescript
// src/components/auth/protected-route.tsx
import { ReactNode } from 'react'
import { Redirect } from 'wouter'
import { useAuth } from '@/contexts/auth-context'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: 'admin' | 'business_user'
  allowedBusinessId?: string  // For business-specific routes
}

export function ProtectedRoute({
  children,
  requiredRole,
  allowedBusinessId
}: ProtectedRouteProps) {
  const { session, userRole, businessId, isLoading } = useAuth()

  if (isLoading) {
    return <div className="p-8">Loading...</div>
  }

  // Not logged in
  if (!session) {
    return <Redirect to="/login" />
  }

  // Admin check (admins can access everything)
  if (requiredRole === 'admin' && userRole !== 'admin') {
    return <Redirect to="/unauthorized" />
  }

  // Business-specific access check
  if (allowedBusinessId && userRole !== 'admin' && businessId !== allowedBusinessId) {
    return <Redirect to="/unauthorized" />
  }

  return <>{children}</>
}
```

### Pattern 3: Business-Scoped Route Guard

**What:** Checks if user can access a specific business's data
**When to use:** `/business/:businessId/*` routes

```typescript
// In a business-specific page component
import { useParams, Redirect } from 'wouter'
import { useAuth } from '@/contexts/auth-context'

export function BusinessHistoryPage() {
  const { businessId: routeBusinessId } = useParams<{ businessId: string }>()
  const { userRole, businessId: userBusinessId, isLoading } = useAuth()

  // Admin can see any business
  // Business user can only see their own
  const canAccess = userRole === 'admin' || userBusinessId === routeBusinessId

  if (isLoading) return <div>Loading...</div>
  if (!canAccess) return <Redirect to="/unauthorized" />

  // ... rest of component
}
```

### Anti-Patterns to Avoid

- **Checking auth only in components:** Always use RLS as backup. Client checks can be bypassed.
- **Storing role in user_metadata:** User can change it. Use app_metadata via Auth Hook.
- **Permissive RLS policies:** Never use `USING (true)` on sensitive tables.
- **Fetching all data then filtering:** Let RLS filter at database level.

## RLS Policies

### Helper Function: Get User's Business ID

```sql
-- Helper function to get business_id from JWT claims
CREATE OR REPLACE FUNCTION auth.business_id()
RETURNS UUID AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb->>'business_id',
    ''
  )::UUID
$$ LANGUAGE sql STABLE;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'user_role' = 'admin',
    false
  )
$$ LANGUAGE sql STABLE;
```

### Policies for Each Table

```sql
-- PROFILES: Users can see their own profile, admins can see all
DROP POLICY IF EXISTS "Allow all access to profiles" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id OR auth.is_admin());
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- BUSINESSES: Admins see all, business users see only their business
DROP POLICY IF EXISTS "Allow all access to businesses" ON businesses;
CREATE POLICY "Admin can view all businesses" ON businesses
  FOR SELECT USING (auth.is_admin());
CREATE POLICY "Business user can view own business" ON businesses
  FOR SELECT USING (id = auth.business_id());
CREATE POLICY "Admin can manage businesses" ON businesses
  FOR ALL USING (auth.is_admin());

-- SCORECARDS: Admins see all, business users see only their business
DROP POLICY IF EXISTS "Allow all access to scorecards" ON scorecards;
CREATE POLICY "Admin can view all scorecards" ON scorecards
  FOR SELECT USING (auth.is_admin());
CREATE POLICY "Business user can view own scorecards" ON scorecards
  FOR SELECT USING (business_id = auth.business_id());
CREATE POLICY "Admin can manage all scorecards" ON scorecards
  FOR ALL USING (auth.is_admin());
CREATE POLICY "Business user can insert own scorecards" ON scorecards
  FOR INSERT WITH CHECK (business_id = auth.business_id());

-- DATA_REQUESTS: Admins manage all, business users see their own
DROP POLICY IF EXISTS "Allow all access to data_requests" ON data_requests;
CREATE POLICY "Admin can manage data_requests" ON data_requests
  FOR ALL USING (auth.is_admin());
CREATE POLICY "Business user can view own data_requests" ON data_requests
  FOR SELECT USING (business_id = auth.business_id());

-- COMPANY_SUBMISSIONS: Keep accessible for magic link flow
-- Token validation happens in app, RLS allows anon insert
DROP POLICY IF EXISTS "Allow all access to company_submissions" ON company_submissions;
CREATE POLICY "Anyone can insert submissions" ON company_submissions
  FOR INSERT WITH CHECK (true);  -- Token validated in app
CREATE POLICY "Admin can view all submissions" ON company_submissions
  FOR SELECT USING (auth.is_admin());
CREATE POLICY "Business user can view own submissions" ON company_submissions
  FOR SELECT USING (
    data_request_id IN (
      SELECT id FROM data_requests WHERE business_id = auth.business_id()
    )
  );

-- SECTORS: Public read, admin write
DROP POLICY IF EXISTS "Allow all access to sectors" ON sectors;
CREATE POLICY "Anyone can view sectors" ON sectors
  FOR SELECT USING (true);
CREATE POLICY "Admin can manage sectors" ON sectors
  FOR ALL USING (auth.is_admin());
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session management | Custom JWT handling | `supabase.auth.getSession()` | Handles refresh tokens, expiry |
| Password hashing | bcrypt implementation | Supabase Auth | Security best practices built-in |
| Token refresh | Manual token rotation | `onAuthStateChange` listener | Automatic, handles edge cases |
| Role storage | localStorage claims | Auth Hook + app_metadata | Secure, can't be tampered |
| Data filtering | Client-side filter | RLS policies | Can't be bypassed via API |

**Key insight:** Supabase Auth + RLS provides defense-in-depth. Even if client code has bugs, database policies prevent unauthorized access.

## Common Pitfalls

### Pitfall 1: Using user_metadata for Roles
**What goes wrong:** Users can modify their own user_metadata via `updateUser()`
**Why it happens:** Confusion between user_metadata and app_metadata
**How to avoid:** Store roles in a profiles table, inject via Auth Hook into app_metadata
**Warning signs:** Roles stored in `session.user.user_metadata` instead of `app_metadata`

### Pitfall 2: Forgetting to Enable Auth Hook
**What goes wrong:** Custom claims not appearing in JWT
**Why it happens:** Auth Hook function created but not enabled in Dashboard
**How to avoid:** After creating SQL function, enable in Authentication > Hooks
**Warning signs:** `session.user.app_metadata` doesn't contain expected claims

### Pitfall 3: Claims Not Updating After Role Change
**What goes wrong:** User's role updated in database but JWT still has old role
**Why it happens:** JWT claims are set at login time, not refreshed automatically
**How to avoid:** Force re-login after role changes, or call `refreshSession()`
**Warning signs:** Admin changes user role but user still has old permissions

### Pitfall 4: RLS Policies Not Applied
**What goes wrong:** Data still accessible without auth
**Why it happens:** Using service_role key instead of anon key, or RLS not enabled
**How to avoid:** Ensure client uses anon key, verify `ENABLE ROW LEVEL SECURITY` ran
**Warning signs:** Can access data without logging in

### Pitfall 5: Magic Link Flow Broken by RLS
**What goes wrong:** Company submission fails because anon user can't insert
**Why it happens:** RLS policies block anonymous inserts
**How to avoid:** Keep `FOR INSERT WITH CHECK (true)` on company_submissions, validate token in app
**Warning signs:** 403 errors on submission page

## Code Examples

### Login Form Component

```typescript
// src/components/auth/login-form.tsx
import { useState } from 'react'
import { useLocation } from 'wouter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [, navigate] = useLocation()
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      toast.error('Invalid email or password')
    } else {
      navigate('/')
    }

    setIsLoading(false)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <img src="/velocity-logo.png" alt="Velocity" className="h-10 mx-auto mb-2" />
        <CardTitle>Chester Business Scorecard</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

### Updated App.tsx with Auth

```typescript
// src/App.tsx
import { Route, Switch, Redirect } from 'wouter'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from '@/lib/query-client'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { LoginPage } from '@/pages/login'
// ... other imports

function AppRoutes() {
  const { userRole, businessId } = useAuth()

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/submit/:token" component={CompanySubmitPage} />
      <Route path="/submit/:token/success" component={SubmissionSuccessPage} />

      {/* Admin-only routes */}
      <Route path="/">
        <ProtectedRoute requiredRole="admin">
          <HomePage />
        </ProtectedRoute>
      </Route>
      <Route path="/portfolio">
        <ProtectedRoute requiredRole="admin">
          <PortfolioPage />
        </ProtectedRoute>
      </Route>
      <Route path="/compare">
        <ProtectedRoute requiredRole="admin">
          <ComparePage />
        </ProtectedRoute>
      </Route>

      {/* Business-scoped routes */}
      <Route path="/business/:businessId">
        {(params) => (
          <ProtectedRoute allowedBusinessId={params.businessId}>
            <HistoryPage />
          </ProtectedRoute>
        )}
      </Route>

      {/* Default redirect */}
      <Route>
        {userRole === 'admin' ? <Redirect to="/" /> : <Redirect to={`/business/${businessId}`} />}
      </Route>
    </Switch>
  )
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <Toaster position="top-center" richColors />
        <div className="min-h-screen bg-background">
          <AppRoutes />
        </div>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
```

## Route Protection Summary

| Route | Protection Level | Who Can Access |
|-------|-----------------|----------------|
| `/login` | Public | Anyone |
| `/submit/:token` | Public (token-validated) | Anyone with valid token |
| `/submit/:token/success` | Public | Anyone |
| `/` | Admin only | Chester admins |
| `/portfolio` | Admin only | Chester admins |
| `/compare` | Admin only | Chester admins |
| `/business/:id` | Business-scoped | Admin OR user linked to that business |
| `/business/:id/charts` | Business-scoped | Admin OR user linked to that business |
| `/business/:id/scorecard` | Business-scoped | Admin OR user linked to that business |

## Implementation Order

Recommended sequence for minimal risk:

1. **Database schema** - Add profiles table, trigger, Auth Hook
2. **Enable Auth Hook** in Supabase Dashboard
3. **Create admin users** - Seed Shane and Dylan as admins
4. **AuthContext** - Add React context and hooks
5. **Login page** - Create login UI
6. **Protected routes** - Wrap routes with guards
7. **Replace RLS policies** - One table at a time, test after each
8. **Test end-to-end** - Verify business isolation

## User Seeding Strategy

For the 19 Chester businesses:

```sql
-- Create admin users first (do this in Supabase Auth UI or via API)
-- Then update their profiles:
UPDATE profiles SET role = 'admin' WHERE id IN (
  SELECT id FROM auth.users WHERE email IN ('shane@chester.com', 'dylan@chester.com')
);

-- For business users, create accounts and link to businesses:
-- Option 1: Manual assignment via admin dashboard
-- Option 2: Domain-based auto-assignment (e.g., @company.com -> Company business)
```

## Open Questions

1. **User creation flow:** Should admins create business accounts manually, or should businesses self-register?
   - Recommendation: Admin-created accounts initially (matches PROJECT.md: "businesses added by Chester admins only")

2. **Multiple users per business:** How to handle when two people from the same company sign up?
   - Recommendation: Domain-based matching or admin approval

3. **Password reset flow:** Standard email or admin-assisted?
   - Recommendation: Standard Supabase password reset (requires email configuration)

## Sources

### Primary (HIGH confidence)
- [Supabase Auth with React - Official Docs](https://supabase.com/docs/guides/auth/quickstarts/react)
- [Row Level Security - Official Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Custom Claims & RBAC - Official Docs](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [User Sessions - Official Docs](https://supabase.com/docs/guides/auth/sessions)
- [signInWithPassword API - Official Docs](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)
- [Managing User Data - Official Docs](https://supabase.com/docs/guides/auth/managing-user-data)

### Secondary (MEDIUM confidence)
- [Supabase Custom Claims GitHub](https://github.com/supabase-community/supabase-custom-claims)
- [Multi-Tenant RLS on Supabase - AntStack](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)

### Tertiary (LOW confidence)
- WebSearch results on React protected routes patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Supabase docs, well-documented patterns
- Architecture: HIGH - Standard React Context + Supabase patterns
- RLS Policies: HIGH - Official documentation with examples
- Auth Hook: MEDIUM - Requires Dashboard configuration, test thoroughly
- Pitfalls: HIGH - Documented in official security guides

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - Supabase Auth is stable)
