import * as Sentry from '@sentry/react'

/**
 * Initialise Sentry error tracking.
 *
 * Requires VITE_SENTRY_DSN environment variable to be set.
 * If the DSN is missing the app works exactly the same - Sentry
 * simply stays uninitialised.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN

  if (!dsn) {
    if (import.meta.env.DEV) {
      console.info('[Sentry] No DSN configured, skipping initialisation')
    }
    return
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE, // 'development' or 'production'

    // Only send errors in production
    enabled: import.meta.env.PROD,

    // Sample rate: 100% of errors, 10% of transactions
    sampleRate: 1.0,
    tracesSampleRate: 0.1,

    // Don't send PII
    sendDefaultPii: false,

    // Filter out common noise
    ignoreErrors: [
      // Browser extensions
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      // Network errors that aren't actionable
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      // Abort errors from cancelled fetch requests (TanStack Query unmount)
      'AbortError',
      /signal is aborted/,
      // Auth session expired (expected behaviour)
      'Invalid Refresh Token',
      'JWT expired',
    ],

    beforeSend(event) {
      // Strip any potential PII from error messages
      if (event.message) {
        event.message = event.message.replace(
          /[\w.+-]+@[\w-]+\.[\w.]+/g,
          '[EMAIL]',
        )
      }
      return event
    },
  })
}
