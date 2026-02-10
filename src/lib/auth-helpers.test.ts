import { describe, it, expect } from 'vitest'

/**
 * Role hierarchy and access control tests.
 *
 * These test the logical patterns used across the Chester application
 * for determining what each role can see and do.
 *
 * Key security invariant (AUTH-08):
 *   Consultants must NOT see raw financial figures (£ values).
 *   Only super_admin and business_user may view financials.
 */

// Role-checking helper functions matching patterns used throughout the app
const isAdminRole = (role: string | null): boolean =>
  role === 'super_admin' || role === 'consultant'

const isSuperAdmin = (role: string | null): boolean =>
  role === 'super_admin'

const isConsultant = (role: string | null): boolean =>
  role === 'consultant'

const isBusinessUser = (role: string | null): boolean =>
  role === 'business_user'

const canSeeFinancials = (role: string | null): boolean =>
  role === 'super_admin' || role === 'business_user'

const canSeeScores = (role: string | null): boolean =>
  role === 'super_admin' || role === 'consultant' || role === 'business_user'

describe('Role hierarchy checks', () => {
  const ALL_ROLES = ['super_admin', 'consultant', 'business_user'] as const
  const EDGE_CASES = [null, '', 'admin', 'unknown', 'SUPER_ADMIN'] as const

  describe('isAdminRole', () => {
    it('returns true for super_admin', () => {
      expect(isAdminRole('super_admin')).toBe(true)
    })

    it('returns true for consultant', () => {
      expect(isAdminRole('consultant')).toBe(true)
    })

    it('returns false for business_user', () => {
      expect(isAdminRole('business_user')).toBe(false)
    })

    it('returns false for null', () => {
      expect(isAdminRole(null)).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(isAdminRole('')).toBe(false)
    })

    it('returns false for unrecognised role strings', () => {
      expect(isAdminRole('admin')).toBe(false)
      expect(isAdminRole('unknown')).toBe(false)
      expect(isAdminRole('SUPER_ADMIN')).toBe(false)
    })
  })

  describe('isSuperAdmin', () => {
    it('returns true only for super_admin', () => {
      expect(isSuperAdmin('super_admin')).toBe(true)
    })

    it('returns false for consultant', () => {
      expect(isSuperAdmin('consultant')).toBe(false)
    })

    it('returns false for business_user', () => {
      expect(isSuperAdmin('business_user')).toBe(false)
    })

    it('returns false for null', () => {
      expect(isSuperAdmin(null)).toBe(false)
    })

    it('returns false for legacy admin string', () => {
      expect(isSuperAdmin('admin')).toBe(false)
    })
  })

  describe('isConsultant', () => {
    it('returns true only for consultant', () => {
      expect(isConsultant('consultant')).toBe(true)
    })

    it('returns false for super_admin', () => {
      expect(isConsultant('super_admin')).toBe(false)
    })

    it('returns false for business_user', () => {
      expect(isConsultant('business_user')).toBe(false)
    })

    it('returns false for null', () => {
      expect(isConsultant(null)).toBe(false)
    })
  })

  describe('isBusinessUser', () => {
    it('returns true only for business_user', () => {
      expect(isBusinessUser('business_user')).toBe(true)
    })

    it('returns false for super_admin', () => {
      expect(isBusinessUser('super_admin')).toBe(false)
    })

    it('returns false for consultant', () => {
      expect(isBusinessUser('consultant')).toBe(false)
    })

    it('returns false for null', () => {
      expect(isBusinessUser(null)).toBe(false)
    })
  })

  describe('canSeeFinancials (AUTH-08 security invariant)', () => {
    it('returns true for super_admin', () => {
      expect(canSeeFinancials('super_admin')).toBe(true)
    })

    it('returns true for business_user (sees own data)', () => {
      expect(canSeeFinancials('business_user')).toBe(true)
    })

    it('returns false for consultant - must NOT see financial figures', () => {
      expect(canSeeFinancials('consultant')).toBe(false)
    })

    it('returns false for null (unauthenticated)', () => {
      expect(canSeeFinancials(null)).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(canSeeFinancials('')).toBe(false)
    })

    it('returns false for unrecognised role strings', () => {
      expect(canSeeFinancials('admin')).toBe(false)
      expect(canSeeFinancials('unknown')).toBe(false)
    })
  })

  describe('canSeeScores', () => {
    it('returns true for all valid roles', () => {
      for (const role of ALL_ROLES) {
        expect(canSeeScores(role)).toBe(true)
      }
    })

    it('returns false for null', () => {
      expect(canSeeScores(null)).toBe(false)
    })

    it('returns false for unrecognised roles', () => {
      expect(canSeeScores('admin')).toBe(false)
      expect(canSeeScores('')).toBe(false)
    })
  })

  describe('role exclusivity', () => {
    it('each valid role maps to exactly one identity function', () => {
      // super_admin
      expect(isSuperAdmin('super_admin')).toBe(true)
      expect(isConsultant('super_admin')).toBe(false)
      expect(isBusinessUser('super_admin')).toBe(false)

      // consultant
      expect(isSuperAdmin('consultant')).toBe(false)
      expect(isConsultant('consultant')).toBe(true)
      expect(isBusinessUser('consultant')).toBe(false)

      // business_user
      expect(isSuperAdmin('business_user')).toBe(false)
      expect(isConsultant('business_user')).toBe(false)
      expect(isBusinessUser('business_user')).toBe(true)
    })

    it('null role returns false for all identity checks', () => {
      expect(isSuperAdmin(null)).toBe(false)
      expect(isConsultant(null)).toBe(false)
      expect(isBusinessUser(null)).toBe(false)
      expect(isAdminRole(null)).toBe(false)
      expect(canSeeFinancials(null)).toBe(false)
      expect(canSeeScores(null)).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('all edge-case values return false for canSeeFinancials', () => {
      for (const edgeCase of EDGE_CASES) {
        expect(canSeeFinancials(edgeCase)).toBe(false)
      }
    })

    it('role checks are case-sensitive', () => {
      expect(isSuperAdmin('Super_Admin')).toBe(false)
      expect(isConsultant('Consultant')).toBe(false)
      expect(isBusinessUser('Business_User')).toBe(false)
      expect(canSeeFinancials('SUPER_ADMIN')).toBe(false)
    })
  })
})
