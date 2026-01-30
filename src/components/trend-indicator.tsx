import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TrendData } from '@/lib/scoring'

interface TrendIndicatorProps {
  trend: TrendData | null
}

/**
 * Visual trend indicator with arrow and point change
 * Shows green up arrow for improvement, red down for decline, gray dash for same
 */
export function TrendIndicator({ trend }: TrendIndicatorProps) {
  if (!trend) return null

  const config = {
    up: { Icon: TrendingUp, className: 'text-green-600', prefix: '+' },
    down: { Icon: TrendingDown, className: 'text-red-600', prefix: '' },
    same: { Icon: Minus, className: 'text-gray-500', prefix: '' },
  }

  const { Icon, className, prefix } = config[trend.direction]

  return (
    <div className={cn('flex items-center gap-1 text-sm font-medium', className)}>
      <Icon className="h-4 w-4" />
      <span>{prefix}{trend.change}</span>
    </div>
  )
}
