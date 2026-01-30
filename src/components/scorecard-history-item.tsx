import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendIndicator } from '@/components/trend-indicator'
import type { Scorecard } from '@/types/database.types'
import type { TrendData } from '@/lib/scoring'

interface ScorecardHistoryItemProps {
  scorecard: Scorecard
  trend: TrendData | null
  onClick: () => void
}

const ragColors: Record<string, string> = {
  green: 'bg-green-500 hover:bg-green-600',
  amber: 'bg-amber-500 hover:bg-amber-600',
  red: 'bg-red-500 hover:bg-red-600',
}

/**
 * Single scorecard in history list
 * Shows month, consultant, score badge, RAG status, and trend indicator
 */
export function ScorecardHistoryItem({ scorecard, trend, onClick }: ScorecardHistoryItemProps) {
  // Parse YYYY-MM format to display as "January 2026"
  const formattedMonth = format(new Date(scorecard.month + '-01'), 'MMMM yyyy')

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent/50"
      onClick={onClick}
    >
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="font-medium">{formattedMonth}</p>
          <p className="text-sm text-muted-foreground">
            {scorecard.consultant_name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={ragColors[scorecard.rag_status]}>
            {scorecard.total_score}
          </Badge>
          <TrendIndicator trend={trend} />
        </div>
      </CardContent>
    </Card>
  )
}
