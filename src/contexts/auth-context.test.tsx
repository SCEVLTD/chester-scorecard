import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/contexts/auth-context'

// Mock supabase client
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null } })
const mockOnAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      signInWithPassword: vi.fn(),
      signInWithOtp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signOut: vi.fn(),
    }
  }
}))

// Mock SessionTimeoutModal to avoid rendering complexity
vi.mock('@/components/session-timeout-modal', () => ({
  SessionTimeoutModal: () => null
}))

/**
 * Build a mock JWT string with the given payload.
 * Uses base64url encoding (replacing + with - and / with _) for the payload
 * to match real JWT behaviour.
 */
function createMockJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `${header}.${body}.mock-signature`
}

/** Helper to build a minimal Supabase-style session object */
function createMockSession(accessToken: string) {
  return {
    access_token: accessToken,
    refresh_token: 'mock-refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'user-123',
      email: 'test@example.com',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-01-01',
    },
  }
}

/** Test component that exposes auth context values */
function AuthConsumer() {
  const { userRole, businessId, isLoading, session } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="role">{userRole ?? 'null'}</span>
      <span data-testid="business-id">{businessId ?? 'null'}</span>
      <span data-testid="has-session">{session ? 'yes' : 'no'}</span>
    </div>
  )
}

describe('AuthProvider - JWT claims parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('parses super_admin role correctly from JWT', async () => {
    const jwt = createMockJwt({ user_role: 'super_admin', sub: 'user-123' })
    const session = createMockSession(jwt)

    mockGetSession.mockResolvedValue({ data: { session } })

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('role').textContent).toBe('super_admin')
    expect(screen.getByTestId('has-session').textContent).toBe('yes')
  })

  it('parses consultant role correctly from JWT', async () => {
    const jwt = createMockJwt({ user_role: 'consultant', sub: 'user-456' })
    const session = createMockSession(jwt)

    mockGetSession.mockResolvedValue({ data: { session } })

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('role').textContent).toBe('consultant')
  })

  it('parses business_user role with business_id', async () => {
    const jwt = createMockJwt({
      user_role: 'business_user',
      business_id: 'biz-789',
      sub: 'user-789',
    })
    const session = createMockSession(jwt)

    mockGetSession.mockResolvedValue({ data: { session } })

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('role').textContent).toBe('business_user')
    expect(screen.getByTestId('business-id').textContent).toBe('biz-789')
  })

  it('maps legacy "admin" role to "super_admin"', async () => {
    const jwt = createMockJwt({ user_role: 'admin', sub: 'user-legacy' })
    const session = createMockSession(jwt)

    mockGetSession.mockResolvedValue({ data: { session } })

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('role').textContent).toBe('super_admin')
  })

  it('returns null role and business_id when no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('role').textContent).toBe('null')
    expect(screen.getByTestId('business-id').textContent).toBe('null')
    expect(screen.getByTestId('has-session').textContent).toBe('no')
  })

  it('returns null for malformed JWT (bad base64)', async () => {
    const session = createMockSession('not-a-valid.!!!invalid-base64!!!.jwt')

    mockGetSession.mockResolvedValue({ data: { session } })

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('role').textContent).toBe('null')
    expect(screen.getByTestId('business-id').textContent).toBe('null')
  })

  it('returns null when JWT payload has no user_role', async () => {
    const jwt = createMockJwt({ sub: 'user-no-role', email: 'test@example.com' })
    const session = createMockSession(jwt)

    mockGetSession.mockResolvedValue({ data: { session } })

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('role').textContent).toBe('null')
  })

  it('returns null business_id when JWT payload has no business_id', async () => {
    const jwt = createMockJwt({ user_role: 'super_admin', sub: 'user-no-biz' })
    const session = createMockSession(jwt)

    mockGetSession.mockResolvedValue({ data: { session } })

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('role').textContent).toBe('super_admin')
    expect(screen.getByTestId('business-id').textContent).toBe('null')
  })
})

describe('AuthProvider - useAuth hook', () => {
  it('throws when used outside AuthProvider', () => {
    // Suppress console.error for the expected React error boundary noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function BadConsumer() {
      useAuth()
      return null
    }

    expect(() => render(<BadConsumer />)).toThrow(
      'useAuth must be used within AuthProvider'
    )

    consoleSpy.mockRestore()
  })
})
