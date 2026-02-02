import { usePendingActionsCount } from '@/hooks/use-actions'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface PendingActionsBadgeProps {
  businessId?: string
}

export function PendingActionsBadge({ businessId }: PendingActionsBadgeProps) {
  const { data: count, isLoading } = usePendingActionsCount(businessId)

  if (isLoading) {
    return <Skeleton className="h-5 w-8 rounded-full" />
  }

  if (!count || count === 0) {
    return null
  }

  return (
    <Badge variant="secondary" className="ml-2">
      {count} action{count !== 1 ? 's' : ''}
    </Badge>
  )
}
