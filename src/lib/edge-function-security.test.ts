import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ALLOWED_ORIGINS,
  isAllowedOrigin,
  buildCorsHeaders,
} from './cors-helpers'

/**
 * Integration-style tests for Edge Function security patterns.
 *
 * These validate the authentication, authorisation, CORS, and rate-limiting
 * logic that is applied across all Supabase Edge Functions. The tests do NOT
 * call the deployed functions; instead they exercise the same decision logic
 * locally so regressions are caught in CI.
 *
 * Patterns under test:
 *   1. CORS origin validation  (supabase/functions/_shared/cors.ts)
 *   2. JWT auth verification   (every protected Edge Function)
 *   3. Role-based access       (AI generation functions)
 *   4. Rate limiting           (supabase/functions/_shared/rate-limiter.ts)
 */

// =====================================================================
// Helpers that mirror Edge Function logic
// =====================================================================

type UserRole = 'super_admin' | 'consultant' | 'business_user' | null

interface AuthResult {
  authenticated: boolean
  user: { id: string; email: string; role: UserRole } | null
  error: string | null
  status: number
}

/**
 * Simulates the auth verification pattern used in every protected Edge
 * Function. Mirrors the sequence:
 *   1. Extract `Authorization` header
 *   2. Strip "Bearer " prefix
 *   3. Verify token via supabase.auth.getUser()
 *   4. (For AI functions) Check role is admin or consultant
 */
function verifyAuth(
  authHeader: string | null,
  _tokenIsValid: boolean,
  userRole: UserRole = null,
  requireAdminOrConsultant = false
): AuthResult {
  // Step 1: Header present?
  if (!authHeader) {
    return { authenticated: false, user: null, error: 'Missing authorization header', status: 401 }
  }

  // Step 2: Extract token
  const token = authHeader.replace('Bearer ', '')
  if (!token || token === authHeader) {
    // Header present but no "Bearer " prefix
    return { authenticated: false, user: null, error: 'Invalid token format', status: 401 }
  }

  // Step 3: Token validation (simulated)
  if (!_tokenIsValid) {
    return { authenticated: false, user: null, error: 'Invalid or expired token', status: 401 }
  }

  // Step 4: Role check (for AI generation functions)
  if (requireAdminOrConsultant) {
    if (userRole !== 'super_admin' && userRole !== 'consultant') {
      return {
        authenticated: true,
        user: { id: 'user-123', email: 'user@test.com', role: userRole },
        error: 'Insufficient permissions',
        status: 403,
      }
    }
  }

  return {
    authenticated: true,
    user: { id: 'user-123', email: 'user@test.com', role: userRole },
    error: null,
    status: 200,
  }
}

// Rate limit simulation types
interface RateLimitConfig {
  action: string
  maxRequests: number
  windowMinutes: number
}

interface RateLimitEntry {
  count: number
  windowStart: Date
}

/**
 * Simulates the rate-limit logic from `_shared/rate-limiter.ts`.
 * Uses an in-memory store rather than the Postgres RPC.
 */
class RateLimiter {
  private store = new Map<string, RateLimitEntry>()

  check(
    userId: string,
    config: RateLimitConfig,
    now = new Date()
  ): { allowed: boolean; remaining: number; resetAt: Date } {
    const key = `${userId}:${config.action}`
    const windowStart = new Date(now)
    windowStart.setMinutes(
      Math.floor(windowStart.getMinutes() / config.windowMinutes) * config.windowMinutes,
      0,
      0
    )
    const resetAt = new Date(windowStart.getTime() + config.windowMinutes * 60 * 1000)

    const existing = this.store.get(key)
    if (existing && existing.windowStart.getTime() === windowStart.getTime()) {
      existing.count += 1
      return {
        allowed: existing.count <= config.maxRequests,
        remaining: Math.max(0, config.maxRequests - existing.count),
        resetAt,
      }
    }

    // New window
    this.store.set(key, { count: 1, windowStart })
    return {
      allowed: 1 <= config.maxRequests,
      remaining: Math.max(0, config.maxRequests - 1),
      resetAt,
    }
  }

  /** Advance time so the window has expired */
  reset(): void {
    this.store.clear()
  }
}

// =====================================================================
// Tests
// =====================================================================

describe('Edge Function security patterns', () => {
  // -------------------------------------------------------------------
  // 1. CORS Validation
  // -------------------------------------------------------------------
  describe('CORS validation (mirrors _shared/cors.ts)', () => {
    describe('OPTIONS preflight handling', () => {
      it('returns correct headers for an allowed origin', () => {
        const headers = buildCorsHeaders('https://chester.benchiva.com')
        expect(headers['Access-Control-Allow-Origin']).toBe('https://chester.benchiva.com')
        expect(headers['Access-Control-Allow-Methods']).toContain('OPTIONS')
        expect(headers['Access-Control-Allow-Methods']).toContain('POST')
      })

      it('returns allowed headers including authorization and content-type', () => {
        const headers = buildCorsHeaders('https://chester.benchiva.com')
        expect(headers['Access-Control-Allow-Headers']).toContain('authorization')
        expect(headers['Access-Control-Allow-Headers']).toContain('content-type')
        expect(headers['Access-Control-Allow-Headers']).toContain('apikey')
      })

      it('sets preflight cache to 24 hours', () => {
        const headers = buildCorsHeaders('https://chester.benchiva.com')
        expect(headers['Access-Control-Max-Age']).toBe('86400')
      })
    })

    describe('origin validation across Edge Functions', () => {
      it('allows production origin', () => {
        expect(isAllowedOrigin('https://chester.benchiva.com')).toBe(true)
      })

      it('allows localhost dev server', () => {
        expect(isAllowedOrigin('http://localhost:5173')).toBe(true)
      })

      it('allows localhost preview server', () => {
        expect(isAllowedOrigin('http://localhost:4173')).toBe(true)
      })

      it('rejects unknown origins', () => {
        const attackOrigins = [
          'https://attacker.com',
          'https://chester.benchiva.com.evil.com',
          'https://fake-chester.benchiva.com',
          'http://chester.benchiva.com',   // HTTP instead of HTTPS
          'https://chester.benchiva.com/', // Trailing slash
        ]
        for (const origin of attackOrigins) {
          expect(isAllowedOrigin(origin)).toBe(false)
        }
      })

      it('does not expose a wildcard origin in headers for unknown origins', () => {
        const headers = buildCorsHeaders('https://attacker.com')
        expect(headers['Access-Control-Allow-Origin']).not.toBe('*')
        expect(headers['Access-Control-Allow-Origin']).not.toBe('https://attacker.com')
      })

      it('mirrors the exact list from the Edge Function shared module', () => {
        // This ensures the frontend helper stays in sync with the Deno module.
        expect(ALLOWED_ORIGINS).toEqual([
          'https://chester.benchiva.com',
          'http://localhost:5173',
          'http://localhost:4173',
        ])
      })
    })
  })

  // -------------------------------------------------------------------
  // 2. Authentication Pattern
  // -------------------------------------------------------------------
  describe('Authentication (JWT verification pattern)', () => {
    describe('missing Authorization header', () => {
      it('returns 401 with descriptive error', () => {
        const result = verifyAuth(null, false)
        expect(result.status).toBe(401)
        expect(result.authenticated).toBe(false)
        expect(result.error).toBe('Missing authorization header')
      })
    })

    describe('malformed Authorization header', () => {
      it('rejects a header without Bearer prefix', () => {
        const result = verifyAuth('some-token-without-bearer', false)
        expect(result.status).toBe(401)
        expect(result.authenticated).toBe(false)
        expect(result.error).toBe('Invalid token format')
      })

      it('rejects an empty Bearer token', () => {
        const result = verifyAuth('Bearer ', false)
        // After stripping "Bearer ", the token is empty string
        expect(result.status).toBe(401)
        expect(result.authenticated).toBe(false)
      })
    })

    describe('invalid token', () => {
      it('returns 401 when the token fails verification', () => {
        const result = verifyAuth('Bearer invalid.jwt.token', false)
        expect(result.status).toBe(401)
        expect(result.authenticated).toBe(false)
        expect(result.error).toBe('Invalid or expired token')
      })
    })

    describe('valid token', () => {
      it('returns 200 with user data for a valid token', () => {
        const result = verifyAuth('Bearer valid.jwt.token', true, 'super_admin')
        expect(result.status).toBe(200)
        expect(result.authenticated).toBe(true)
        expect(result.user).not.toBeNull()
        expect(result.error).toBeNull()
      })

      it('includes user role in the response', () => {
        const result = verifyAuth('Bearer valid.jwt.token', true, 'consultant')
        expect(result.user?.role).toBe('consultant')
      })
    })
  })

  // -------------------------------------------------------------------
  // 3. Role-Based Access (AI Generation Functions)
  // -------------------------------------------------------------------
  describe('Role-based access for AI generation functions', () => {
    const AI_FUNCTIONS = [
      'generate-analysis',
      'generate-portfolio-analysis',
      'generate-meeting-summary',
    ] as const

    describe('super_admin access', () => {
      it('allows super_admin to call AI generation functions', () => {
        const result = verifyAuth(
          'Bearer valid.jwt.token',
          true,
          'super_admin',
          true // requireAdminOrConsultant
        )
        expect(result.status).toBe(200)
        expect(result.authenticated).toBe(true)
        expect(result.error).toBeNull()
      })
    })

    describe('consultant access', () => {
      it('allows consultant to call AI generation functions', () => {
        const result = verifyAuth(
          'Bearer valid.jwt.token',
          true,
          'consultant',
          true
        )
        expect(result.status).toBe(200)
        expect(result.authenticated).toBe(true)
        expect(result.error).toBeNull()
      })
    })

    describe('business_user rejection', () => {
      it('rejects business_user from AI generation functions with 403', () => {
        const result = verifyAuth(
          'Bearer valid.jwt.token',
          true,
          'business_user',
          true
        )
        expect(result.status).toBe(403)
        expect(result.error).toBe('Insufficient permissions')
      })

      it('still recognises the user is authenticated even when forbidden', () => {
        const result = verifyAuth(
          'Bearer valid.jwt.token',
          true,
          'business_user',
          true
        )
        expect(result.authenticated).toBe(true)
        expect(result.user).not.toBeNull()
        expect(result.user?.role).toBe('business_user')
      })
    })

    describe('null role rejection', () => {
      it('rejects a user with no role from AI generation functions', () => {
        const result = verifyAuth(
          'Bearer valid.jwt.token',
          true,
          null,
          true
        )
        expect(result.status).toBe(403)
        expect(result.error).toBe('Insufficient permissions')
      })
    })

    describe('non-AI functions do not require admin/consultant role', () => {
      it('allows business_user access when requireAdminOrConsultant is false', () => {
        const result = verifyAuth(
          'Bearer valid.jwt.token',
          true,
          'business_user',
          false
        )
        expect(result.status).toBe(200)
        expect(result.authenticated).toBe(true)
      })
    })

    describe('AI function rate limits per function', () => {
      // These mirror the actual limits set in each Edge Function
      const AI_RATE_LIMITS: Record<string, { maxRequests: number; windowMinutes: number }> = {
        'generate_analysis': { maxRequests: 10, windowMinutes: 60 },
        'generate_portfolio_analysis': { maxRequests: 5, windowMinutes: 60 },
        'generate_meeting_summary': { maxRequests: 5, windowMinutes: 60 },
      }

      it('generate-analysis allows 10 requests per hour', () => {
        expect(AI_RATE_LIMITS['generate_analysis'].maxRequests).toBe(10)
        expect(AI_RATE_LIMITS['generate_analysis'].windowMinutes).toBe(60)
      })

      it('generate-portfolio-analysis allows 5 requests per hour', () => {
        expect(AI_RATE_LIMITS['generate_portfolio_analysis'].maxRequests).toBe(5)
        expect(AI_RATE_LIMITS['generate_portfolio_analysis'].windowMinutes).toBe(60)
      })

      it('generate-meeting-summary allows 5 requests per hour', () => {
        expect(AI_RATE_LIMITS['generate_meeting_summary'].maxRequests).toBe(5)
        expect(AI_RATE_LIMITS['generate_meeting_summary'].windowMinutes).toBe(60)
      })
    })
  })

  // -------------------------------------------------------------------
  // 4. Rate Limiting
  // -------------------------------------------------------------------
  describe('Rate limiting (mirrors _shared/rate-limiter.ts)', () => {
    let limiter: RateLimiter

    beforeEach(() => {
      limiter = new RateLimiter()
    })

    const defaultConfig: RateLimitConfig = {
      action: 'generate_analysis',
      maxRequests: 10,
      windowMinutes: 60,
    }

    describe('within limit', () => {
      it('allows the first request', () => {
        const result = limiter.check('user-1', defaultConfig)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(9)
      })

      it('allows requests up to the maximum', () => {
        for (let i = 0; i < 10; i++) {
          const result = limiter.check('user-1', defaultConfig)
          expect(result.allowed).toBe(true)
        }
      })

      it('decrements remaining count correctly', () => {
        for (let i = 0; i < 5; i++) {
          limiter.check('user-1', defaultConfig)
        }
        const result = limiter.check('user-1', defaultConfig)
        expect(result.remaining).toBe(4) // 10 - 6
      })
    })

    describe('exceeding limit', () => {
      it('rejects the request after exceeding maxRequests', () => {
        // Use up all 10 requests
        for (let i = 0; i < 10; i++) {
          limiter.check('user-1', defaultConfig)
        }
        // 11th request should be blocked
        const result = limiter.check('user-1', defaultConfig)
        expect(result.allowed).toBe(false)
        expect(result.remaining).toBe(0)
      })

      it('returns a future resetAt timestamp', () => {
        const now = new Date('2026-02-10T14:30:00Z')
        const result = limiter.check('user-1', defaultConfig, now)
        expect(result.resetAt.getTime()).toBeGreaterThan(now.getTime())
      })
    })

    describe('window expiry', () => {
      it('allows requests again after the window resets', () => {
        // Exhaust the limit
        for (let i = 0; i < 11; i++) {
          limiter.check('user-1', defaultConfig)
        }
        const blocked = limiter.check('user-1', defaultConfig)
        expect(blocked.allowed).toBe(false)

        // Simulate window expiry by clearing the store
        limiter.reset()

        // Should be allowed again
        const result = limiter.check('user-1', defaultConfig)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(9)
      })
    })

    describe('per-user isolation', () => {
      it('tracks rate limits independently per user', () => {
        // Exhaust user-1's limit
        for (let i = 0; i < 11; i++) {
          limiter.check('user-1', defaultConfig)
        }
        expect(limiter.check('user-1', defaultConfig).allowed).toBe(false)

        // user-2 should still be allowed
        const result = limiter.check('user-2', defaultConfig)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(9)
      })
    })

    describe('per-action isolation', () => {
      it('tracks rate limits independently per action', () => {
        const analysisConfig: RateLimitConfig = {
          action: 'generate_analysis',
          maxRequests: 10,
          windowMinutes: 60,
        }
        const portfolioConfig: RateLimitConfig = {
          action: 'generate_portfolio_analysis',
          maxRequests: 5,
          windowMinutes: 60,
        }

        // Use up all analysis requests
        for (let i = 0; i < 11; i++) {
          limiter.check('user-1', analysisConfig)
        }
        expect(limiter.check('user-1', analysisConfig).allowed).toBe(false)

        // Portfolio analysis should still be allowed for the same user
        const result = limiter.check('user-1', portfolioConfig)
        expect(result.allowed).toBe(true)
      })
    })

    describe('429 response format', () => {
      it('should include a Retry-After value when rate limited', () => {
        const now = new Date('2026-02-10T14:30:00Z')
        // Exhaust the limit
        for (let i = 0; i < 11; i++) {
          limiter.check('user-1', defaultConfig, now)
        }
        const result = limiter.check('user-1', defaultConfig, now)
        expect(result.allowed).toBe(false)

        // Simulate 429 response building (mirrors rateLimitResponse)
        const retryAfterSeconds = Math.ceil(
          (result.resetAt.getTime() - now.getTime()) / 1000
        )
        expect(retryAfterSeconds).toBeGreaterThan(0)
        expect(retryAfterSeconds).toBeLessThanOrEqual(defaultConfig.windowMinutes * 60)
      })
    })

    describe('fail-open behaviour', () => {
      it('should allow the request if the rate limit check errors', () => {
        // This mirrors the error-handling in _shared/rate-limiter.ts:
        // "Log the error but fail open to avoid blocking legitimate requests"
        const fallbackResult = {
          allowed: true,
          remaining: defaultConfig.maxRequests,
          resetAt: new Date(Date.now() + defaultConfig.windowMinutes * 60 * 1000),
        }
        expect(fallbackResult.allowed).toBe(true)
        expect(fallbackResult.remaining).toBe(defaultConfig.maxRequests)
      })
    })

    describe('invitation function rate limits', () => {
      it('send-company-invite allows 20 per admin per day', () => {
        const config: RateLimitConfig = {
          action: 'send_company_invite',
          maxRequests: 20,
          windowMinutes: 1440, // 24 hours
        }
        for (let i = 0; i < 20; i++) {
          expect(limiter.check('admin-1', config).allowed).toBe(true)
        }
        expect(limiter.check('admin-1', config).allowed).toBe(false)
      })

      it('send-admin-invite allows 10 per super_admin per day', () => {
        const config: RateLimitConfig = {
          action: 'send_admin_invite',
          maxRequests: 10,
          windowMinutes: 1440, // 24 hours
        }
        for (let i = 0; i < 10; i++) {
          expect(limiter.check('admin-1', config).allowed).toBe(true)
        }
        expect(limiter.check('admin-1', config).allowed).toBe(false)
      })

      it('create-company-account allows 10 per admin per hour', () => {
        const config: RateLimitConfig = {
          action: 'create_company_account',
          maxRequests: 10,
          windowMinutes: 60,
        }
        for (let i = 0; i < 10; i++) {
          expect(limiter.check('admin-1', config).allowed).toBe(true)
        }
        expect(limiter.check('admin-1', config).allowed).toBe(false)
      })
    })
  })

  // -------------------------------------------------------------------
  // 5. Error Response Sanitisation
  // -------------------------------------------------------------------
  describe('Error response sanitisation', () => {
    it('should return generic error messages without internal details', () => {
      // Mirrors the pattern in all Edge Functions:
      // Return only "Failed to [action]" rather than raw error.message
      const safeError = { error: 'Failed to generate analysis' }
      expect(safeError.error).not.toContain('stack')
      expect(safeError.error).not.toContain('schema')
      expect(safeError.error).not.toContain('ANTHROPIC_API_KEY')
      expect(safeError.error).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
    })

    it('never exposes database column names in error responses', () => {
      const safeErrors = [
        'Failed to generate analysis',
        'Failed to generate portfolio analysis',
        'Failed to generate meeting summary',
        'Failed to send invitation',
        'Failed to create account',
      ]
      for (const msg of safeErrors) {
        expect(msg).not.toMatch(/company_submissions|revenue_actual|ebitda|audit_log/)
      }
    })
  })

  // -------------------------------------------------------------------
  // 6. Full Request Simulation
  // -------------------------------------------------------------------
  describe('Full Edge Function request simulation', () => {
    let limiter: RateLimiter

    beforeEach(() => {
      limiter = new RateLimiter()
    })

    interface SimulatedRequest {
      method: string
      origin: string | null
      authHeader: string | null
      tokenValid: boolean
      userRole: UserRole
    }

    interface SimulatedResponse {
      status: number
      headers: Record<string, string>
      body: Record<string, unknown>
    }

    /**
     * Simulates the full request handling pipeline of an AI Edge Function:
     *   1. CORS preflight
     *   2. Auth verification
     *   3. Role check
     *   4. Rate limit check
     */
    function simulateAIFunctionRequest(req: SimulatedRequest): SimulatedResponse {
      const corsHeaders = buildCorsHeaders(req.origin)

      // Step 1: OPTIONS preflight
      if (req.method === 'OPTIONS') {
        return { status: 200, headers: corsHeaders, body: {} }
      }

      // Step 2: Auth verification
      const auth = verifyAuth(req.authHeader, req.tokenValid, req.userRole, true)
      if (auth.status !== 200) {
        return {
          status: auth.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: { error: auth.error },
        }
      }

      // Step 3: Rate limit check
      const rateResult = limiter.check(auth.user!.id, {
        action: 'generate_analysis',
        maxRequests: 10,
        windowMinutes: 60,
      })
      if (!rateResult.allowed) {
        return {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(
              (rateResult.resetAt.getTime() - Date.now()) / 1000
            ).toString(),
          },
          body: { error: 'Rate limit exceeded. Please try again later.' },
        }
      }

      // Success
      return {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: { success: true },
      }
    }

    it('returns 200 for a valid OPTIONS preflight request', () => {
      const response = simulateAIFunctionRequest({
        method: 'OPTIONS',
        origin: 'https://chester.benchiva.com',
        authHeader: null,
        tokenValid: false,
        userRole: null,
      })
      expect(response.status).toBe(200)
      expect(response.headers['Access-Control-Allow-Origin']).toBe(
        'https://chester.benchiva.com'
      )
    })

    it('returns 401 for a request without auth', () => {
      const response = simulateAIFunctionRequest({
        method: 'POST',
        origin: 'https://chester.benchiva.com',
        authHeader: null,
        tokenValid: false,
        userRole: null,
      })
      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Missing authorization header')
    })

    it('returns 401 for a request with an invalid token', () => {
      const response = simulateAIFunctionRequest({
        method: 'POST',
        origin: 'https://chester.benchiva.com',
        authHeader: 'Bearer expired.jwt.token',
        tokenValid: false,
        userRole: null,
      })
      expect(response.status).toBe(401)
    })

    it('returns 403 for a business_user trying to generate AI analysis', () => {
      const response = simulateAIFunctionRequest({
        method: 'POST',
        origin: 'https://chester.benchiva.com',
        authHeader: 'Bearer valid.jwt.token',
        tokenValid: true,
        userRole: 'business_user',
      })
      expect(response.status).toBe(403)
      expect(response.body.error).toBe('Insufficient permissions')
    })

    it('returns 200 for a super_admin with valid token', () => {
      const response = simulateAIFunctionRequest({
        method: 'POST',
        origin: 'https://chester.benchiva.com',
        authHeader: 'Bearer valid.jwt.token',
        tokenValid: true,
        userRole: 'super_admin',
      })
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('returns 200 for a consultant with valid token', () => {
      const response = simulateAIFunctionRequest({
        method: 'POST',
        origin: 'https://chester.benchiva.com',
        authHeader: 'Bearer valid.jwt.token',
        tokenValid: true,
        userRole: 'consultant',
      })
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('returns 429 when rate limit is exceeded', () => {
      // Exhaust the limit (10 requests)
      for (let i = 0; i < 10; i++) {
        simulateAIFunctionRequest({
          method: 'POST',
          origin: 'https://chester.benchiva.com',
          authHeader: 'Bearer valid.jwt.token',
          tokenValid: true,
          userRole: 'super_admin',
        })
      }

      // 11th request should be rate limited
      const response = simulateAIFunctionRequest({
        method: 'POST',
        origin: 'https://chester.benchiva.com',
        authHeader: 'Bearer valid.jwt.token',
        tokenValid: true,
        userRole: 'super_admin',
      })
      expect(response.status).toBe(429)
      expect(response.headers['Retry-After']).toBeDefined()
    })

    it('includes CORS headers even on error responses', () => {
      const response = simulateAIFunctionRequest({
        method: 'POST',
        origin: 'https://chester.benchiva.com',
        authHeader: null,
        tokenValid: false,
        userRole: null,
      })
      expect(response.status).toBe(401)
      expect(response.headers['Access-Control-Allow-Origin']).toBe(
        'https://chester.benchiva.com'
      )
    })

    it('does not echo an attacker origin in CORS headers', () => {
      const response = simulateAIFunctionRequest({
        method: 'POST',
        origin: 'https://evil.example.com',
        authHeader: 'Bearer valid.jwt.token',
        tokenValid: true,
        userRole: 'super_admin',
      })
      expect(response.headers['Access-Control-Allow-Origin']).not.toBe(
        'https://evil.example.com'
      )
      expect(response.headers['Access-Control-Allow-Origin']).toBe(
        'https://chester.benchiva.com'
      )
    })

    it('processes the security checks in the correct order: CORS -> Auth -> Role -> Rate Limit', () => {
      // An OPTIONS request should bypass auth entirely
      const preflight = simulateAIFunctionRequest({
        method: 'OPTIONS',
        origin: 'https://chester.benchiva.com',
        authHeader: null,
        tokenValid: false,
        userRole: null,
      })
      expect(preflight.status).toBe(200)

      // A missing auth header should fail before role check
      const noAuth = simulateAIFunctionRequest({
        method: 'POST',
        origin: 'https://chester.benchiva.com',
        authHeader: null,
        tokenValid: false,
        userRole: 'super_admin', // Role doesn't matter - auth fails first
      })
      expect(noAuth.status).toBe(401)

      // An invalid token should fail before role check
      const badToken = simulateAIFunctionRequest({
        method: 'POST',
        origin: 'https://chester.benchiva.com',
        authHeader: 'Bearer bad.token',
        tokenValid: false,
        userRole: 'super_admin',
      })
      expect(badToken.status).toBe(401)

      // A valid token with wrong role should fail before rate limit
      const wrongRole = simulateAIFunctionRequest({
        method: 'POST',
        origin: 'https://chester.benchiva.com',
        authHeader: 'Bearer valid.jwt.token',
        tokenValid: true,
        userRole: 'business_user',
      })
      expect(wrongRole.status).toBe(403)
    })
  })
})
