import { useState } from 'react'
import { useParams, useLocation } from 'wouter'
import { ArrowLeft, Calendar, Users, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { MeetingSummaryCard } from '@/components/meeting-summary-card'
import { useMeeting, useMeetingActions, useDeleteMeeting } from '@/hooks/use-meetings'
import { ActionModal } from '@/components/action-modal'
import type { MeetingSummary } from '@/schemas/meeting-summary'
import type { Action } from '@/types/database.types'

/**
 * Meeting Detail Page
 *
 * Displays full meeting details with:
 * - AI summary (read-only if finalized)
 * - Editable user notes section
 * - Linked actions list
 * - Delete option (drafts only)
 */
export function MeetingPage() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const [, navigate] = useLocation()
  const [actionModalOpen, setActionModalOpen] = useState(false)
  const [prefillAction, setPrefillAction] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { data: meeting, isLoading, error } = useMeeting(meetingId)
  const { data: linkedActions } = useMeetingActions(meetingId)
  const deleteMeeting = useDeleteMeeting()

  // Format meeting date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // Get meeting type label
  const getMeetingTypeLabel = (type: string) => {
    switch (type) {
      case 'friday_group':
        return 'Friday Group Meeting'
      case 'quarterly_review':
        return 'Quarterly Review'
      case 'one_on_one':
        return '1:1 Meeting'
      case 'ad_hoc':
        return 'Ad Hoc Meeting'
      default:
        return type
    }
  }

  // Handle create action from AI suggestion
  const handleCreateAction = (description: string) => {
    setPrefillAction(description)
    setActionModalOpen(true)
  }

  // Handle delete meeting
  const handleDelete = async () => {
    if (!meetingId) return

    try {
      await deleteMeeting.mutateAsync(meetingId)
      navigate('/meetings')
    } catch (error) {
      console.error('Failed to delete meeting:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-2xl font-bold mb-4">Meeting Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The meeting you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate('/meetings')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Meetings
          </Button>
        </div>
      </div>
    )
  }

  // Parse AI summary from JSONB
  const aiSummary = meeting.ai_summary as MeetingSummary

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/meetings')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Meetings
          </Button>
          <img src="/velocity-logo.png" alt="Velocity" className="h-8" />
        </div>

        {/* Meeting Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5" />
                  {meeting.title}
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">
                    {getMeetingTypeLabel(meeting.meeting_type)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(meeting.meeting_date)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    • {meeting.businesses_count} businesses
                  </span>
                  <span className="text-sm text-muted-foreground">
                    • {meeting.month_analyzed}
                  </span>
                </div>
              </div>

              {/* Delete button (drafts only) */}
              {meeting.status === 'draft' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Attendees */}
            {meeting.attendees && meeting.attendees.length > 0 && (
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Attendees: {meeting.attendees.join(', ')}</span>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Meeting Summary Card with editing */}
        <MeetingSummaryCard
          summary={aiSummary}
          meetingId={meeting.id}
          userNotes={meeting.user_notes}
          status={meeting.status}
          onCreateAction={handleCreateAction}
          editable={true}
        />

        {/* Linked Actions */}
        {linkedActions && linkedActions.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Actions from this Meeting</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(linkedActions as Action[]).map((action) => (
                  <li
                    key={action.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded"
                  >
                    <div>
                      <p className="text-sm">{action.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {action.owner} • Due: {new Date(action.due_date).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <Badge variant={action.status === 'complete' ? 'secondary' : 'outline'}>
                      {action.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Action Modal */}
        <ActionModal
          open={actionModalOpen}
          onOpenChange={setActionModalOpen}
          meetingId={meeting.id}
          prefillDescription={prefillAction}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Meeting?</DialogTitle>
              <DialogDescription>
                This will permanently delete this meeting and its notes.
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  handleDelete()
                  setDeleteDialogOpen(false)
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
