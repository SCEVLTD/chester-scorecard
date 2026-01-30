import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getRagStatus } from '@/lib/scoring'

interface ScoreHeaderProps {
  totalScore: number
}

/**
 * ScoreHeader component - displays total score with RAG badge
 *
 * Shows:
 * - Total score (X / 100)
 * - RAG status badge (Green >= 75, Amber >= 60, Red < 60)
 *
 * Positioned at top of scorecard form
 */
export function ScoreHeader({ totalScore }: ScoreHeaderProps) {
  const rag = getRagStatus(totalScore)
  const ragConfig = {
    green: { label: 'Green', className: 'bg-green-500 hover:bg-green-600 text-white' },
    amber: { label: 'Amber', className: 'bg-amber-500 hover:bg-amber-600 text-white' },
    red: { label: 'Red', className: 'bg-red-500 hover:bg-red-600 text-white' },
  }
  const { label, className } = ragConfig[rag]

  return (
    <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
      <div>
        <p className="text-sm text-muted-foreground">Total Score</p>
        <p className="text-3xl font-bold">{totalScore} / 100</p>
      </div>
      <Badge className={cn('px-3 py-1 text-sm', className)}>
        {label}
      </Badge>
    </div>
  )
}
