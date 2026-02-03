/**
 * Compare Page
 *
 * Allows consultants to compare 2-4 businesses side-by-side.
 * Shows all scorecard metrics in a comparison table.
 */

import { useState, useMemo } from 'react'
import { useSearch } from 'wouter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GitCompare } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { BusinessSelector } from '@/components/compare/business-selector'
import { ComparisonColumns } from '@/components/compare/comparison-columns'
import { useBusinesses } from '@/hooks/use-businesses'
import { useComparisonData } from '@/hooks/use-comparison-data'

export function ComparePage() {
  const searchString = useSearch()

  // Parse initial selection from URL params
  const initialIds = useMemo(() => {
    const params = new URLSearchParams(searchString)
    const idsParam = params.get('ids')
    return idsParam ? idsParam.split(',').filter(Boolean) : []
  }, [searchString])

  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds)

  // Fetch all businesses for the selector
  const { data: businesses, isLoading: isLoadingBusinesses } = useBusinesses()

  // Fetch comparison data for selected businesses
  const { data: scorecardData, isLoading: isLoadingComparison } =
    useComparisonData(selectedIds)

  // Build business name lookup
  const businessMap = useMemo(() => {
    if (!businesses) return new Map<string, string>()
    return new Map(businesses.map((b) => [b.id, b.name]))
  }, [businesses])

  // Get names for selected businesses (preserving order)
  const selectedNames = useMemo(() => {
    return selectedIds.map((id) => businessMap.get(id) || 'Unknown')
  }, [selectedIds, businessMap])

  // Build simplified business list for selector
  const businessList = useMemo(() => {
    if (!businesses) return []
    return businesses.map((b) => ({ id: b.id, name: b.name }))
  }, [businesses])

  // Update URL when selection changes (optional enhancement)
  const handleSelectionChange = (ids: string[]) => {
    setSelectedIds(ids)
    // Update URL params for shareable links
    if (ids.length > 0) {
      const params = new URLSearchParams()
      params.set('ids', ids.join(','))
      window.history.replaceState(null, '', `/compare?${params.toString()}`)
    } else {
      window.history.replaceState(null, '', '/compare')
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <PageHeader backTo="/portfolio" showTagline={false} />
        <div className="flex items-center gap-2 mb-6">
          <GitCompare className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Compare Businesses</h1>
        </div>

        {/* Business Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Select Businesses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingBusinesses ? (
              <p className="text-muted-foreground">Loading businesses...</p>
            ) : (
              <BusinessSelector
                businesses={businessList}
                selected={selectedIds}
                onSelectionChange={handleSelectionChange}
              />
            )}
          </CardContent>
        </Card>

        {/* Comparison Table */}
        {selectedIds.length >= 2 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Comparison ({selectedIds.length} businesses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingComparison ? (
                <p className="text-muted-foreground">Loading comparison data...</p>
              ) : (
                <ComparisonColumns
                  businessNames={selectedNames}
                  scorecardData={scorecardData}
                />
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                Select at least 2 businesses to compare their scorecards
                side-by-side.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
