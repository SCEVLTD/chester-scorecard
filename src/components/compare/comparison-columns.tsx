import { Badge } from '@/components/ui/badge'
import type { Scorecard } from '@/types/database.types'
import { cn } from '@/lib/utils'

interface ComparisonColumnsProps {
  businessNames: string[]
  scorecardData: (Scorecard[] | undefined)[] // Parallel array with businessNames
}

// Metric row configuration
interface MetricRow {
  label: string
  key: keyof Scorecard | 'section-header'
  type: 'number' | 'percentage' | 'text' | 'rag' | 'section-header'
}

const metricRows: MetricRow[] = [
  { label: 'Latest Month', key: 'month', type: 'text' },
  { label: 'Total Score', key: 'total_score', type: 'number' },
  { label: 'RAG Status', key: 'rag_status', type: 'rag' },
  { label: 'Financial', key: 'section-header', type: 'section-header' },
  { label: 'Revenue Variance', key: 'revenue_variance', type: 'percentage' },
  { label: 'Gross Profit Variance', key: 'gross_profit_variance', type: 'percentage' },
  { label: 'Overheads Variance', key: 'overheads_variance', type: 'percentage' },
  { label: 'EBITDA Variance', key: 'net_profit_variance', type: 'percentage' },
  { label: 'People', key: 'section-header', type: 'section-header' },
  { label: 'Productivity Benchmark', key: 'productivity_benchmark', type: 'number' },
  { label: 'Productivity Actual', key: 'productivity_actual', type: 'number' },
  { label: 'Leadership', key: 'leadership', type: 'text' },
  { label: 'Market', key: 'section-header', type: 'section-header' },
  { label: 'Market Demand', key: 'market_demand', type: 'text' },
  { label: 'Marketing', key: 'marketing', type: 'text' },
  { label: 'Product', key: 'section-header', type: 'section-header' },
  { label: 'Product Strength', key: 'product_strength', type: 'text' },
  { label: 'Suppliers', key: 'section-header', type: 'section-header' },
  { label: 'Supplier Strength', key: 'supplier_strength', type: 'text' },
  { label: 'Sales', key: 'section-header', type: 'section-header' },
  { label: 'Sales Execution', key: 'sales_execution', type: 'text' },
]

const ragColors: Record<string, string> = {
  green: 'bg-green-500 text-white',
  amber: 'bg-amber-500 text-white',
  red: 'bg-red-500 text-white',
}

/**
 * Format a value for display in the comparison table
 */
function formatValue(
  value: unknown,
  type: MetricRow['type']
): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">-</span>
  }

  switch (type) {
    case 'percentage':
      return `${value}%`
    case 'number':
      return String(value)
    case 'rag':
      return (
        <Badge className={cn(ragColors[value as string] || 'bg-gray-500')}>
          {String(value)}
        </Badge>
      )
    case 'text':
      return String(value)
    default:
      return String(value)
  }
}

/**
 * Side-by-side comparison columns component
 *
 * Displays metrics for 2-4 businesses in a table layout with:
 * - Grouped sections (Financial, People, Market, Product, Suppliers, Sales)
 * - Alternating row backgrounds
 * - RAG status badges
 * - Proper alignment for numbers
 *
 * Usage:
 * ```tsx
 * <ComparisonColumns
 *   businessNames={['Acme', 'Beta']}
 *   scorecardData={[acmeScorecards, betaScorecards]}
 * />
 * ```
 */
export function ComparisonColumns({
  businessNames,
  scorecardData,
}: ComparisonColumnsProps) {
  // Get latest scorecard for each business
  const latestScorecards = scorecardData.map((data) =>
    data && data.length > 0 ? data[0] : null
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[600px]">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3 font-semibold min-w-[180px]">
              Metric
            </th>
            {businessNames.map((name) => (
              <th
                key={name}
                className="text-left p-3 font-semibold min-w-[140px]"
              >
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metricRows.map((row, index) => {
            // Section header row
            if (row.type === 'section-header') {
              return (
                <tr key={`${row.label}-${index}`} className="bg-muted/50">
                  <td
                    colSpan={businessNames.length + 1}
                    className="p-3 font-semibold text-muted-foreground"
                  >
                    {row.label}
                  </td>
                </tr>
              )
            }

            // Data row
            return (
              <tr
                key={row.key}
                className={cn(
                  'border-b hover:bg-muted/30',
                  index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                )}
              >
                <td className="p-3 text-sm">{row.label}</td>
                {latestScorecards.map((scorecard, i) => {
                  const value = scorecard
                    ? scorecard[row.key as keyof Scorecard]
                    : null
                  return (
                    <td
                      key={businessNames[i]}
                      className={cn(
                        'p-3 text-sm',
                        row.type === 'number' || row.type === 'percentage'
                          ? 'text-right font-mono'
                          : ''
                      )}
                    >
                      {formatValue(value, row.type)}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
