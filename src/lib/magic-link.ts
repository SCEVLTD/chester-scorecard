/**
 * Magic link utilities for company data requests
 */

/**
 * Generate a secure random token for magic links
 * Uses crypto.getRandomValues for browser-safe randomness
 * 32 bytes = 64 hex chars (256-bit entropy)
 */
export function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Calculate expiry date (default 7 days from now)
 */
export function calculateExpiry(days: number = 7): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

/**
 * Build the public submission URL
 */
export function buildMagicLink(token: string): string {
  const baseUrl = window.location.origin
  return `${baseUrl}/submit/${token}`
}

/**
 * Check if a data request has expired
 */
export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

/**
 * Format expiry for display
 */
export function formatExpiry(expiresAt: string): string {
  const expiry = new Date(expiresAt)
  const now = new Date()
  const diffMs = expiry.getTime() - now.getTime()

  if (diffMs < 0) {
    return 'Expired'
  }

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} remaining`
  }

  if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} remaining`
  }

  return 'Less than 1 hour remaining'
}
