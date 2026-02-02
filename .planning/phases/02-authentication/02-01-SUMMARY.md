# Summary: 02-01 Database Auth Schema

**Status:** Complete (with manual step required)
**Completed:** 2026-02-02

## What Was Built

Database foundation for multi-tenant authentication:

1. **Profiles table** - Links `auth.users` to `businesses` with role column
2. **Auto-profile trigger** - Creates profile record when users sign up
3. **JWT claims hook** - Adds `user_role` and `business_id` to access tokens
4. **RLS helper functions** - `public.is_admin()` and `public.get_my_business_id()`

## Commits

| Commit | Description |
|--------|-------------|
| 692b3d3 | feat(02-01): create auth schema migration |
| dbdbaea | fix(02-01): decode JWT claims for custom auth hook |

## Files Created/Modified

| File | Action |
|------|--------|
| supabase/migrations/20260202_add_auth_schema.sql | Created |
| src/contexts/auth-context.tsx | Modified (JWT claim decoding) |

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Helper functions in `public` schema | `auth` schema requires elevated permissions not available via MCP |
| JWT decoding in AuthContext | Custom claims from auth hook go into JWT payload, not app_metadata |

## Manual Action Required

**Enable Auth Hook in Supabase Dashboard:**
1. Go to Authentication → Hooks
2. Find "Custom Access Token" section
3. Select function: `custom_access_token_hook`
4. Enable and Save

**Create Admin User:**
1. Go to Authentication → Users → Add user
2. Create user with admin email
3. After creation, run in SQL Editor:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE id = '<user-id>';
   ```

## Verification

- [x] profiles table exists with correct schema
- [x] handle_new_user trigger attached to auth.users
- [x] custom_access_token_hook function created
- [x] is_admin() and get_my_business_id() helper functions exist
- [ ] Auth hook enabled in Dashboard (manual)
- [ ] Admin user created (manual)

## Notes

Migration applied directly via Supabase MCP tools. The auth hook function is created but must be manually enabled in Dashboard - there's no API for this configuration.
