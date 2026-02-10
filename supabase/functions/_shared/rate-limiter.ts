import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RateLimitConfig {
  action: string
  maxRequests: number
  windowMinutes: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

/**
 * Check and increment a rate limit for a given user and action.
 * Uses an atomic Postgres RPC function to avoid race conditions.
 *
 * @param supabase - A Supabase client with service role privileges
 * @param userId - The authenticated user's ID
 * @param config - Rate limit configuration (action name, max requests, window size)
 * @returns Whether the request is allowed, remaining quota, and window reset time
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // Calculate the start of the current rate limit window
  const now = new Date()
  const windowStart = new Date(now)
  windowStart.setMinutes(
    Math.floor(windowStart.getMinutes() / config.windowMinutes) * config.windowMinutes,
    0,
    0
  )

  // Atomically increment the counter via Postgres RPC
  const { data: currentCount, error } = await supabase.rpc('increment_rate_limit', {
    p_user_id: userId,
    p_action: config.action,
    p_window_start: windowStart.toISOString(),
  })

  if (error) {
    // Log the error but fail open to avoid blocking legitimate requests
    // if the rate limit infrastructure is temporarily unavailable
    console.error('Rate limit check failed:', error)
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(windowStart.getTime() + config.windowMinutes * 60 * 1000),
    }
  }

  const count = currentCount as number
  const resetAt = new Date(windowStart.getTime() + config.windowMinutes * 60 * 1000)

  return {
    allowed: count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - count),
    resetAt,
  }
}

/**
 * Build a 429 Too Many Requests response with appropriate headers.
 *
 * @param corsHeaders - CORS headers to include in the response
 * @param resetAt - When the rate limit window resets
 * @returns A Response object with status 429
 */
export function rateLimitResponse(
  corsHeaders: Record<string, string>,
  resetAt: Date
): Response {
  const retryAfterSeconds = Math.ceil((resetAt.getTime() - Date.now()) / 1000)

  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded. Please try again later.',
      retryAfter: resetAt.toISOString(),
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': Math.max(1, retryAfterSeconds).toString(),
      },
    }
  )
}
