import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProtectedRoute } from '@/components/auth/protected-route'

// Mock useAuth - returns values we control per test
const mockUseAuth = vi.fn()
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock wouter Redirect so we can inspect where it redirects
vi.mock('wouter', () => ({
  Redirect: ({ to }: { to: string }) => (
    <div data-testid="redirect" data-to={to} />
  ),
}))

/** Helper to build a minimal mock return value for useAuth */
function authState(overrides: {
  session?: object | null
  userRole?: 'super_admin' | 'consultant' | 'business_user' | null
  businessId?: string | null
  isLoading?: boolean
}) {
  return {
    session: overrides.session ?? null,
    user: overrides.session ? { id: 'u1', email: 'test@example.com' } : null,
    userRole: overrides.userRole ?? null,
    businessId: overrides.businessId ?? null,
    isLoading: overrides.isLoading ?? false,
    isSessionExpiring: false,
    signIn: vi.fn(),
    signInWithMagicLink: vi.fn(),
    resetPassword: vi.fn(),
    signOut: vi.fn(),
    extendSession: vi.fn(),
  }
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ------------------------------------------------------------------
  // Loading & no-session states
  // ------------------------------------------------------------------

  it('shows loading spinner when isLoading is true', () => {
    mockUseAuth.mockReturnValue(authState({ isLoading: true }))

    render(
      <ProtectedRoute>
        <p>Protected content</p>
      </ProtectedRoute>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })

  it('redirects to /login when there is no session', () => {
    mockUseAuth.mockReturnValue(authState({ session: null }))

    render(
      <ProtectedRoute>
        <p>Protected content</p>
      </ProtectedRoute>
    )

    const redirect = screen.getByTestId('redirect')
    expect(redirect).toHaveAttribute('data-to', '/login')
  })

  // ------------------------------------------------------------------
  // requiredRole = 'admin' (super_admin + consultant allowed)
  // ------------------------------------------------------------------

  it('renders children for super_admin with requiredRole="admin"', () => {
    mockUseAuth.mockReturnValue(
      authState({ session: {}, userRole: 'super_admin' })
    )

    render(
      <ProtectedRoute requiredRole="admin">
        <p>Admin content</p>
      </ProtectedRoute>
    )

    expect(screen.getByText('Admin content')).toBeInTheDocument()
  })

  it('renders children for consultant with requiredRole="admin"', () => {
    mockUseAuth.mockReturnValue(
      authState({ session: {}, userRole: 'consultant' })
    )

    render(
      <ProtectedRoute requiredRole="admin">
        <p>Admin content</p>
      </ProtectedRoute>
    )

    expect(screen.getByText('Admin content')).toBeInTheDocument()
  })

  it('redirects business_user with businessId from admin page to /company/dashboard', () => {
    mockUseAuth.mockReturnValue(
      authState({
        session: {},
        userRole: 'business_user',
        businessId: 'biz-123',
      })
    )

    render(
      <ProtectedRoute requiredRole="admin">
        <p>Admin content</p>
      </ProtectedRoute>
    )

    const redirect = screen.getByTestId('redirect')
    expect(redirect).toHaveAttribute('data-to', '/company/dashboard')
  })

  it('redirects business_user without businessId from admin page to /unauthorized', () => {
    mockUseAuth.mockReturnValue(
      authState({
        session: {},
        userRole: 'business_user',
        businessId: null,
      })
    )

    render(
      <ProtectedRoute requiredRole="admin">
        <p>Admin content</p>
      </ProtectedRoute>
    )

    const redirect = screen.getByTestId('redirect')
    expect(redirect).toHaveAttribute('data-to', '/unauthorized')
  })

  // ------------------------------------------------------------------
  // requiredRole = 'super_admin' (only super_admin allowed)
  // ------------------------------------------------------------------

  it('renders children for super_admin with requiredRole="super_admin"', () => {
    mockUseAuth.mockReturnValue(
      authState({ session: {}, userRole: 'super_admin' })
    )

    render(
      <ProtectedRoute requiredRole="super_admin">
        <p>Super admin content</p>
      </ProtectedRoute>
    )

    expect(screen.getByText('Super admin content')).toBeInTheDocument()
  })

  it('redirects consultant from super_admin-only pages to /unauthorized', () => {
    mockUseAuth.mockReturnValue(
      authState({ session: {}, userRole: 'consultant' })
    )

    render(
      <ProtectedRoute requiredRole="super_admin">
        <p>Super admin content</p>
      </ProtectedRoute>
    )

    const redirect = screen.getByTestId('redirect')
    expect(redirect).toHaveAttribute('data-to', '/unauthorized')
  })

  it('redirects business_user from super_admin-only pages to /unauthorized', () => {
    mockUseAuth.mockReturnValue(
      authState({
        session: {},
        userRole: 'business_user',
        businessId: 'biz-1',
      })
    )

    render(
      <ProtectedRoute requiredRole="super_admin">
        <p>Super admin content</p>
      </ProtectedRoute>
    )

    const redirect = screen.getByTestId('redirect')
    expect(redirect).toHaveAttribute('data-to', '/unauthorized')
  })

  // ------------------------------------------------------------------
  // requiredRole = 'business_user' (business_user + admin roles allowed)
  // ------------------------------------------------------------------

  it('renders children for business_user with requiredRole="business_user"', () => {
    mockUseAuth.mockReturnValue(
      authState({
        session: {},
        userRole: 'business_user',
        businessId: 'biz-1',
      })
    )

    render(
      <ProtectedRoute requiredRole="business_user">
        <p>Business content</p>
      </ProtectedRoute>
    )

    expect(screen.getByText('Business content')).toBeInTheDocument()
  })

  it('renders children for super_admin with requiredRole="business_user"', () => {
    mockUseAuth.mockReturnValue(
      authState({ session: {}, userRole: 'super_admin' })
    )

    render(
      <ProtectedRoute requiredRole="business_user">
        <p>Business content</p>
      </ProtectedRoute>
    )

    expect(screen.getByText('Business content')).toBeInTheDocument()
  })

  it('renders children for consultant with requiredRole="business_user"', () => {
    mockUseAuth.mockReturnValue(
      authState({ session: {}, userRole: 'consultant' })
    )

    render(
      <ProtectedRoute requiredRole="business_user">
        <p>Business content</p>
      </ProtectedRoute>
    )

    expect(screen.getByText('Business content')).toBeInTheDocument()
  })

  // ------------------------------------------------------------------
  // allowedBusinessId checks
  // ------------------------------------------------------------------

  it('allows business_user to access their own business route', () => {
    mockUseAuth.mockReturnValue(
      authState({
        session: {},
        userRole: 'business_user',
        businessId: 'biz-abc',
      })
    )

    render(
      <ProtectedRoute allowedBusinessId="biz-abc">
        <p>My business</p>
      </ProtectedRoute>
    )

    expect(screen.getByText('My business')).toBeInTheDocument()
  })

  it('blocks business_user from another business route', () => {
    mockUseAuth.mockReturnValue(
      authState({
        session: {},
        userRole: 'business_user',
        businessId: 'biz-abc',
      })
    )

    render(
      <ProtectedRoute allowedBusinessId="biz-other">
        <p>Other business</p>
      </ProtectedRoute>
    )

    const redirect = screen.getByTestId('redirect')
    expect(redirect).toHaveAttribute('data-to', '/unauthorized')
  })

  it('allows super_admin to access any business route', () => {
    mockUseAuth.mockReturnValue(
      authState({ session: {}, userRole: 'super_admin' })
    )

    render(
      <ProtectedRoute allowedBusinessId="biz-any">
        <p>Any business</p>
      </ProtectedRoute>
    )

    expect(screen.getByText('Any business')).toBeInTheDocument()
  })

  it('allows consultant to access any business route', () => {
    mockUseAuth.mockReturnValue(
      authState({ session: {}, userRole: 'consultant' })
    )

    render(
      <ProtectedRoute allowedBusinessId="biz-any">
        <p>Any business</p>
      </ProtectedRoute>
    )

    expect(screen.getByText('Any business')).toBeInTheDocument()
  })

  // ------------------------------------------------------------------
  // No requiredRole (just session needed)
  // ------------------------------------------------------------------

  it('renders children when no requiredRole and session exists', () => {
    mockUseAuth.mockReturnValue(
      authState({ session: {}, userRole: 'business_user', businessId: 'b1' })
    )

    render(
      <ProtectedRoute>
        <p>General protected content</p>
      </ProtectedRoute>
    )

    expect(screen.getByText('General protected content')).toBeInTheDocument()
  })
})
