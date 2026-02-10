import type { ReactElement } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'
import { useTrialStatus } from '@/hooks/use-trial-status'

/**
 * Displays a banner at the top of the page when the organisation is in trial mode.
 * - Amber background when trial is active with > 3 days remaining
 * - Red background when < 3 days remaining
 * - Hidden when trial is not active or no trial period is set
 */
export function TrialBanner(): ReactElement | null {
  const { isTrialActive, daysRemaining, trialEndsAt, isLoading } = useTrialStatus()

  if (isLoading || !isTrialActive || !trialEndsAt) {
    return null
  }

  const isUrgent = daysRemaining <= 3
  const formattedDate = trialEndsAt.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div
      className={`w-full px-4 py-2 text-sm font-medium text-center ${
        isUrgent
          ? 'bg-red-500 text-white'
          : 'bg-amber-400 text-amber-950'
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {isUrgent ? (
          <AlertTriangle className="h-4 w-4 shrink-0" />
        ) : (
          <Clock className="h-4 w-4 shrink-0" />
        )}
        <span>
          {isUrgent
            ? `Trial expires ${daysRemaining === 0 ? 'today' : `in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`}! `
            : `Free trial: ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining. `}
          Ends {formattedDate}.
        </span>
      </div>
    </div>
  )
}
