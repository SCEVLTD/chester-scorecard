/**
 * Submission Status Panel
 * Shows which businesses have submitted/pending for current month
 * Allows admin to manually trigger reminder emails
 */

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, Mail, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useSubmissionStatus } from '@/hooks/use-submission-status'
import { useAuth } from '@/contexts/auth-context'

interface SubmissionStatusPanelProps {
  month: string // YYYY-MM format
}

export function SubmissionStatusPanel({ month }: SubmissionStatusPanelProps) {
  const { data: statuses, isLoading } = useSubmissionStatus(month)
  const [isSending, setIsSending] = useState(false)
  const { userRole } = useAuth()

  // Split into submitted and pending
  const submitted = statuses?.filter((s) => s.submitted) || []
  const pending = statuses?.filter((s) => !s.submitted) || []

  // Format month for display (e.g., "2026-02" -> "Feb 2026")
  const monthLabel = (() => {
    try {
      const [year, monthNum] = month.split('-')
      const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
      return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    } catch {
      return month
    }
  })()

  const handleSendReminders = async () => {
    if (pending.length === 0) {
      toast.error('No pending submissions to remind')
      return
    }

    setIsSending(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-reminders')

      if (error) throw error

      if (data?.success) {
        toast.success(`Sent ${data.sent} reminder email(s)`)
      } else {
        toast.error(data?.error || 'Failed to send reminders')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send reminders')
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Submission Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading submission status...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Handle empty state
  if (!statuses || statuses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Submission Status</CardTitle>
          <p className="text-sm text-muted-foreground">{monthLabel}</p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No businesses found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Submission Status</CardTitle>
            <p className="text-sm text-muted-foreground">{monthLabel}</p>
          </div>
          {userRole === 'super_admin' && (
            <Button
              onClick={handleSendReminders}
              disabled={pending.length === 0 || isSending}
              size="sm"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Reminders
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Submitted Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <h3 className="font-medium text-sm">Submitted</h3>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {submitted.length}
              </Badge>
            </div>
            {submitted.length > 0 ? (
              <ul className="space-y-1.5">
                {submitted.map((business) => (
                  <li
                    key={business.id}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                    <span>{business.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">None submitted yet</p>
            )}
          </div>

          {/* Pending Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-amber-600" />
              <h3 className="font-medium text-sm">Pending</h3>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                {pending.length}
              </Badge>
            </div>
            {pending.length > 0 ? (
              <ul className="space-y-1.5">
                {pending.map((business) => (
                  <li
                    key={business.id}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Clock className="h-3 w-3 text-amber-600 flex-shrink-0" />
                    <span>{business.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-green-600 italic">All businesses submitted!</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
