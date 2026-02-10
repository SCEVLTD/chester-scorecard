import { useMemo } from 'react'
import { useOrganisation } from '@/hooks/use-organisation'

interface TrialStatus {
  /** Whether the organisation is currently in a trial period */
  isTrialActive: boolean
  /** Number of full days remaining in the trial (0 if expired or no trial) */
  daysRemaining: number
  /** The date/time the trial ends, or null if no trial period is set */
  trialEndsAt: Date | null
  /** Whether the trial data has finished loading */
  isLoading: boolean
}

/**
 * Hook to check the trial status of the current organisation.
 * Reads `trial_ends_at` from `org.settings` JSONB field.
 */
export function useTrialStatus(): TrialStatus {
  const { data: org, isLoading } = useOrganisation()

  return useMemo(() => {
    if (isLoading || !org) {
      return {
        isTrialActive: false,
        daysRemaining: 0,
        trialEndsAt: null,
        isLoading,
      }
    }

    const settings = org.settings as Record<string, unknown> | null
    const trialEndsAtRaw = settings?.trial_ends_at as string | undefined

    if (!trialEndsAtRaw) {
      return {
        isTrialActive: false,
        daysRemaining: 0,
        trialEndsAt: null,
        isLoading: false,
      }
    }

    const trialEndsAt = new Date(trialEndsAtRaw)
    const now = new Date()
    const diffMs = trialEndsAt.getTime() - now.getTime()
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    const isTrialActive = diffMs > 0

    return {
      isTrialActive,
      daysRemaining,
      trialEndsAt,
      isLoading: false,
    }
  }, [org, isLoading])
}
