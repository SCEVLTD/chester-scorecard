import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Trophy,
  AlertCircle,
  MessageSquare,
  Users,
  Plus,
  Check,
  Lock,
  Loader2,
} from 'lucide-react'
import type { MeetingSummary } from '@/schemas/meeting-summary'
import type { MeetingStatus } from '@/types/database.types'
import { useSaveMeetingNotes, useFinalizeMeeting } from '@/hooks/use-meetings'
import { useDebouncedCallback } from 'use-debounce'

interface MeetingSummaryCardProps {
  summary: MeetingSummary
  meetingId?: string
  userNotes?: string | null
  status?: MeetingStatus
  onCreateAction?: (description: string) => void
  editable?: boolean
}

/**
 * Meeting Summary Card Component
 *
 * Displays AI-generated meeting preparation summary with aggregated portfolio insights.
 * Shows wins, challenges, discussion points, and suggested group actions.
 *
 * When meetingId is provided, enables:
 * - User notes editing (Granola-style: alongside AI)
 * - Create action buttons
 * - Finalize meeting functionality
 */
export function MeetingSummaryCard({
  summary,
  meetingId,
  userNotes: initialUserNotes,
  status = 'draft',
  onCreateAction,
  editable = true,
}: MeetingSummaryCardProps) {
  const [userNotes, setUserNotes] = useState(initialUserNotes || '')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const saveMeetingNotes = useSaveMeetingNotes()
  const finalizeMeeting = useFinalizeMeeting()

  const formattedDate = new Date(summary.generatedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Debounced save function for auto-save
  const debouncedSave = useDebouncedCallback(
    async (notes: string) => {
      if (!meetingId || status === 'finalized') return

      setIsSaving(true)
      try {
        await saveMeetingNotes.mutateAsync({ meetingId, userNotes: notes })
        setLastSaved(new Date())
      } catch (error) {
        console.error('Failed to save notes:', error)
      } finally {
        setIsSaving(false)
      }
    },
    1000 // 1 second debounce
  )

  // Handle notes change with auto-save
  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newNotes = e.target.value
      setUserNotes(newNotes)
      if (meetingId && status !== 'finalized') {
        debouncedSave(newNotes)
      }
    },
    [meetingId, status, debouncedSave]
  )

  // Handle finalize
  const handleFinalize = async () => {
    if (!meetingId) return

    try {
      await finalizeMeeting.mutateAsync({ meetingId })
    } catch (error) {
      console.error('Failed to finalize meeting:', error)
    }
  }

  // Sync with external userNotes prop changes
  useEffect(() => {
    if (initialUserNotes !== undefined && initialUserNotes !== userNotes) {
      setUserNotes(initialUserNotes || '')
    }
  }, [initialUserNotes])

  const isFinalized = status === 'finalized'
  const canEdit = editable && !isFinalized && meetingId

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <FileText className="h-5 w-5" />
          Meeting Prep Summary
          {meetingId && (
            <Badge
              variant={isFinalized ? 'secondary' : 'outline'}
              className={isFinalized ? 'bg-green-100 text-green-700' : ''}
            >
              {isFinalized ? (
                <>
                  <Lock className="h-3 w-3 mr-1" />
                  Finalized
                </>
              ) : (
                'Draft'
              )}
            </Badge>
          )}
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {formattedDate}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Health Summary */}
        <section>
          <h3 className="text-base font-semibold mb-2">Portfolio Health</h3>
          <p className="text-sm text-muted-foreground">{summary.healthSummary}</p>
        </section>

        {/* Aggregated Wins */}
        <section>
          <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-green-600" />
            Wins Across Portfolio
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {summary.aggregatedWins.map((win, i) => (
              <li key={i}>{win}</li>
            ))}
          </ul>
        </section>

        {/* Common Challenges */}
        <section>
          <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            Common Challenges
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {summary.commonChallenges.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>

        {/* Discussion Points */}
        <section>
          <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            Discussion Points
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            {summary.discussionPoints.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        </section>

        {/* Group Actions */}
        <section>
          <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-600" />
            Suggested Group Actions
          </h3>
          <ul className="space-y-2">
            {summary.groupActions.map((action, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="flex-1">• {action}</span>
                {onCreateAction && !isFinalized && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => onCreateAction(action)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Action
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* User Notes Section (Granola-style: alongside AI) */}
        {meetingId && (
          <section className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-600" />
                Your Notes
              </h3>
              {isSaving && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
              {!isSaving && lastSaved && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Check className="h-3 w-3 text-green-600" />
                  Saved
                </span>
              )}
            </div>
            {canEdit ? (
              <Textarea
                value={userNotes}
                onChange={handleNotesChange}
                placeholder="Add your notes here... (auto-saves)"
                className="min-h-[100px] bg-white"
              />
            ) : (
              <div className="min-h-[100px] p-3 bg-gray-50 rounded-md text-sm text-muted-foreground whitespace-pre-wrap">
                {userNotes || (
                  <span className="italic">No notes added</span>
                )}
              </div>
            )}
          </section>
        )}

        {/* Finalize Button */}
        {meetingId && !isFinalized && editable && (
          <div className="border-t pt-4 flex justify-end">
            <Button
              onClick={handleFinalize}
              disabled={finalizeMeeting.isPending}
              variant="default"
            >
              {finalizeMeeting.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Finalizing...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Finalize Meeting
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
