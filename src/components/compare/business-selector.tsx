import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import { toast } from 'sonner'

const MAX_SELECTION = 4

interface BusinessSelectorProps {
  businesses: { id: string; name: string }[]
  selected: string[]
  onSelectionChange: (ids: string[]) => void
}

/**
 * Business multi-select component with 4-business limit
 *
 * Displays a grid of business buttons for selection. Shows check icon
 * on selected businesses. Enforces maximum of 4 selections with toast warning.
 *
 * Usage:
 * ```tsx
 * <BusinessSelector
 *   businesses={[{ id: '1', name: 'Acme' }]}
 *   selected={['1']}
 *   onSelectionChange={(ids) => setSelected(ids)}
 * />
 * ```
 */
export function BusinessSelector({
  businesses,
  selected,
  onSelectionChange,
}: BusinessSelectorProps) {
  const handleToggle = (id: string) => {
    const isSelected = selected.includes(id)

    if (isSelected) {
      // Remove from selection
      onSelectionChange(selected.filter((s) => s !== id))
    } else {
      // Add to selection (with limit check)
      if (selected.length >= MAX_SELECTION) {
        toast.warning('Maximum 4 businesses for comparison')
        return
      }
      onSelectionChange([...selected, id])
    }
  }

  return (
    <div className="space-y-4">
      {/* Selection counter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Selected:</span>
        <Badge variant={selected.length >= 2 ? 'default' : 'secondary'}>
          {selected.length}/{MAX_SELECTION}
        </Badge>
        {selected.length < 2 && (
          <span className="text-sm text-muted-foreground">
            (select at least 2 to compare)
          </span>
        )}
      </div>

      {/* Business button grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {businesses.map((business) => {
          const isSelected = selected.includes(business.id)
          return (
            <Button
              key={business.id}
              variant={isSelected ? 'default' : 'outline'}
              className="justify-start"
              onClick={() => handleToggle(business.id)}
            >
              {isSelected && <Check className="h-4 w-4 mr-2" />}
              <span className="truncate">{business.name}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
