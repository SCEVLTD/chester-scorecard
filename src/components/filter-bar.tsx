/**
 * FilterBar Component
 *
 * Unified filter bar for consistent filtering across dashboard pages.
 * Supports year selection, E-Profile filtering, and view toggle.
 */

import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { LayoutGrid, Table } from 'lucide-react'
import { E_PROFILE_LABELS, type EProfile } from '@/types/database.types'

const ALL_PROFILES: EProfile[] = ['E0', 'E1', 'E2', 'E3', 'E4', 'E5']

interface FilterBarProps {
  /** Currently selected year */
  year: number
  /** Callback when year changes */
  onYearChange: (year: number) => void
  /** List of available years to select from */
  availableYears: number[]
  /** Optional E-Profile filter configuration */
  eProfileFilter?: {
    /** Currently selected profiles */
    selected: Set<EProfile>
    /** Callback when a profile is toggled */
    onToggle: (profile: EProfile) => void
  }
  /** Optional view toggle configuration */
  viewToggle?: {
    /** Current view value */
    value: 'table' | 'graph'
    /** Callback when view changes */
    onChange: (view: 'table' | 'graph') => void
  }
}

export function FilterBar({
  year,
  onYearChange,
  availableYears,
  eProfileFilter,
  viewToggle,
}: FilterBarProps) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Year Selector - always visible and prominent */}
          <div className="flex items-center gap-3">
            <Label htmlFor="year-selector" className="text-sm font-semibold whitespace-nowrap">
              Year:
            </Label>
            <Select
              value={year.toString()}
              onValueChange={(v) => onYearChange(parseInt(v))}
            >
              <SelectTrigger id="year-selector" className="w-[120px] font-semibold text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* E-Profile Filter - optional */}
          {eProfileFilter && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold whitespace-nowrap">E-Profile:</span>
              <div className="flex flex-wrap gap-3">
                {ALL_PROFILES.map((profile) => (
                  <div key={profile} className="flex items-center space-x-1.5">
                    <Checkbox
                      id={`filter-bar-${profile}`}
                      checked={eProfileFilter.selected.has(profile)}
                      onCheckedChange={() => eProfileFilter.onToggle(profile)}
                    />
                    <Label
                      htmlFor={`filter-bar-${profile}`}
                      className="text-sm cursor-pointer"
                      title={E_PROFILE_LABELS[profile]}
                    >
                      {profile}
                    </Label>
                  </div>
                ))}
              </div>
              {eProfileFilter.selected.size < ALL_PROFILES.length && (
                <span className="text-sm text-blue-600">
                  ({eProfileFilter.selected.size}/{ALL_PROFILES.length})
                </span>
              )}
            </div>
          )}

          {/* View Toggle - optional */}
          {viewToggle && (
            <div className="flex items-center gap-2">
              <Button
                variant={viewToggle.value === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => viewToggle.onChange('table')}
                aria-label="Table view"
              >
                <Table className="h-4 w-4 mr-1" />
                Table
              </Button>
              <Button
                variant={viewToggle.value === 'graph' ? 'default' : 'outline'}
                size="sm"
                onClick={() => viewToggle.onChange('graph')}
                aria-label="Graph view"
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Graph
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
