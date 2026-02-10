/**
 * CORS validation helpers.
 *
 * These mirror the logic in `supabase/functions/_shared/cors.ts` so that
 * the same origin-checking rules can be tested in the frontend test suite
 * without standing up a Deno runtime.
 *
 * Keep this list in sync with the Edge Function ALLOWED_ORIGINS constant.
 */

export const ALLOWED_ORIGINS = [
  'https://chester.benchiva.com',
  'http://localhost:5173',
  'http://localhost:4173',
] as const

/**
 * Returns true when the given origin is in the allowed list.
 * An empty or undefined origin is always rejected.
 */
export function isAllowedOrigin(origin: string | undefined | null): boolean {
  if (!origin) return false
  return (ALLOWED_ORIGINS as readonly string[]).includes(origin)
}

/**
 * Build the CORS response headers for a given origin.
 *
 * - If the origin is allowed, `Access-Control-Allow-Origin` is set to that origin.
 * - If the origin is NOT allowed, it falls back to the first (production) origin
 *   so that the browser will block the request due to origin mismatch.
 */
export function buildCorsHeaders(origin: string | undefined | null): Record<string, string> {
  const allowedOrigin = origin && isAllowedOrigin(origin)
    ? origin
    : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }
}
