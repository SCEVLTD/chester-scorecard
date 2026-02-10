import { describe, it, expect } from 'vitest'
import {
  ALLOWED_ORIGINS,
  isAllowedOrigin,
  buildCorsHeaders,
} from './cors-helpers'

/**
 * Tests for the CORS validation helpers.
 *
 * These verify the same origin-checking logic used in every Supabase
 * Edge Function via `supabase/functions/_shared/cors.ts`.
 */

describe('CORS helpers', () => {
  // ---------------------------------------------------------------
  // ALLOWED_ORIGINS constant
  // ---------------------------------------------------------------
  describe('ALLOWED_ORIGINS', () => {
    it('includes the production origin', () => {
      expect(ALLOWED_ORIGINS).toContain('https://chester.benchiva.com')
    })

    it('includes the local dev server origin', () => {
      expect(ALLOWED_ORIGINS).toContain('http://localhost:5173')
    })

    it('includes the local preview server origin', () => {
      expect(ALLOWED_ORIGINS).toContain('http://localhost:4173')
    })

    it('does not include a wildcard', () => {
      expect(ALLOWED_ORIGINS).not.toContain('*')
    })

    it('contains exactly three entries', () => {
      expect(ALLOWED_ORIGINS).toHaveLength(3)
    })
  })

  // ---------------------------------------------------------------
  // isAllowedOrigin
  // ---------------------------------------------------------------
  describe('isAllowedOrigin', () => {
    it('accepts the production origin', () => {
      expect(isAllowedOrigin('https://chester.benchiva.com')).toBe(true)
    })

    it('accepts the local dev origin', () => {
      expect(isAllowedOrigin('http://localhost:5173')).toBe(true)
    })

    it('accepts the local preview origin', () => {
      expect(isAllowedOrigin('http://localhost:4173')).toBe(true)
    })

    it('rejects an unknown origin', () => {
      expect(isAllowedOrigin('https://evil.example.com')).toBe(false)
    })

    it('rejects a similar but wrong origin (trailing slash)', () => {
      expect(isAllowedOrigin('https://chester.benchiva.com/')).toBe(false)
    })

    it('rejects a subdomain of the production origin', () => {
      expect(isAllowedOrigin('https://sub.chester.benchiva.com')).toBe(false)
    })

    it('rejects a different port on localhost', () => {
      expect(isAllowedOrigin('http://localhost:3000')).toBe(false)
    })

    it('rejects null', () => {
      expect(isAllowedOrigin(null)).toBe(false)
    })

    it('rejects undefined', () => {
      expect(isAllowedOrigin(undefined)).toBe(false)
    })

    it('rejects an empty string', () => {
      expect(isAllowedOrigin('')).toBe(false)
    })

    it('is case-sensitive (rejects upper-case variant)', () => {
      expect(isAllowedOrigin('HTTPS://CHESTER.BENCHIVA.COM')).toBe(false)
    })

    it('rejects the production origin over HTTP (must be HTTPS)', () => {
      expect(isAllowedOrigin('http://chester.benchiva.com')).toBe(false)
    })
  })

  // ---------------------------------------------------------------
  // buildCorsHeaders
  // ---------------------------------------------------------------
  describe('buildCorsHeaders', () => {
    it('echoes the allowed origin back for a valid origin', () => {
      const headers = buildCorsHeaders('https://chester.benchiva.com')
      expect(headers['Access-Control-Allow-Origin']).toBe('https://chester.benchiva.com')
    })

    it('echoes the localhost dev origin back when matched', () => {
      const headers = buildCorsHeaders('http://localhost:5173')
      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173')
    })

    it('falls back to the production origin for a disallowed origin', () => {
      const headers = buildCorsHeaders('https://evil.example.com')
      expect(headers['Access-Control-Allow-Origin']).toBe('https://chester.benchiva.com')
    })

    it('falls back to the production origin for null', () => {
      const headers = buildCorsHeaders(null)
      expect(headers['Access-Control-Allow-Origin']).toBe('https://chester.benchiva.com')
    })

    it('falls back to the production origin for undefined', () => {
      const headers = buildCorsHeaders(undefined)
      expect(headers['Access-Control-Allow-Origin']).toBe('https://chester.benchiva.com')
    })

    it('falls back to the production origin for empty string', () => {
      const headers = buildCorsHeaders('')
      expect(headers['Access-Control-Allow-Origin']).toBe('https://chester.benchiva.com')
    })

    it('includes the correct Allow-Headers', () => {
      const headers = buildCorsHeaders('https://chester.benchiva.com')
      expect(headers['Access-Control-Allow-Headers']).toBe(
        'authorization, x-client-info, apikey, content-type'
      )
    })

    it('allows POST and OPTIONS methods only', () => {
      const headers = buildCorsHeaders('https://chester.benchiva.com')
      expect(headers['Access-Control-Allow-Methods']).toBe('POST, OPTIONS')
    })

    it('sets a 24-hour preflight cache (86400 seconds)', () => {
      const headers = buildCorsHeaders('https://chester.benchiva.com')
      expect(headers['Access-Control-Max-Age']).toBe('86400')
    })

    it('never sets the origin to a wildcard', () => {
      const origins = [
        'https://chester.benchiva.com',
        'http://localhost:5173',
        'https://evil.example.com',
        null,
        undefined,
        '',
      ]
      for (const origin of origins) {
        const headers = buildCorsHeaders(origin)
        expect(headers['Access-Control-Allow-Origin']).not.toBe('*')
      }
    })
  })
})
