import { format, isPast, isToday } from 'date-fns'
import { Check, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useBusinessPendingActions, useCompleteAction } from '@/hooks/use-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface PendingActionsListProps {
  businessId: string
}

export function PendingActionsList({ businessId }: PendingActionsListProps) {
  const { data: actions, isLoading } = useBusinessPendingActions(businessId)
  const completeAction = useCompleteAction()

  const handleComplete = async (actionId: string) => {
    try {
      await completeAction.mutateAsync(actionId)
      toast.success('Action marked as complete')
    } catch (error) {
      console.error('Failed to complete action:', error)
      toast.error('Failed to complete action')
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pending Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!actions || actions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pending Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No pending actions</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pending Actions ({actions.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action) => {
          const dueDate = new Date(action.due_date)
          const isOverdue = isPast(dueDate) && !isToday(dueDate)
          const isDueToday = isToday(dueDate)

          return (
            <div
              key={action.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{action.description}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>Owner: {action.owner}</span>
                  <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : isDueToday ? 'text-amber-500' : ''}`}>
                    {isOverdue ? (
                      <AlertCircle className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    Due: {format(dueDate, 'MMM d, yyyy')}
                    {isOverdue && ' (overdue)'}
                    {isDueToday && ' (today)'}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleComplete(action.id)}
                disabled={completeAction.isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                Done
              </Button>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
