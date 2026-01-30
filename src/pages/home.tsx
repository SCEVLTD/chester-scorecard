import { useState, useMemo } from 'react'
import { useLocation } from 'wouter'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Check, X, LayoutGrid } from 'lucide-react'
import { useBusinesses, useCreateBusiness, useUpdateBusinessSector } from '@/hooks/use-businesses'
import { useLatestScoresPerBusiness } from '@/hooks/use-scorecards'
import { useSectors } from '@/hooks/use-sectors'
import { SectorSelect } from '@/components/sector-select'

const ragColors: Record<string, string> = {
  green: 'bg-green-500 hover:bg-green-600',
  amber: 'bg-amber-500 hover:bg-amber-600',
  red: 'bg-red-500 hover:bg-red-600',
}

export function HomePage() {
  const [, navigate] = useLocation()
  const [newBusinessName, setNewBusinessName] = useState('')
  const [filterSectorId, setFilterSectorId] = useState<string | null>(null)
  const [editingSectorId, setEditingSectorId] = useState<string | null>(null)
  const [pendingSectorId, setPendingSectorId] = useState<string | null>(null)

  const { data: businesses, isLoading } = useBusinesses()
  const { data: sectors } = useSectors()
  const { data: latestScores } = useLatestScoresPerBusiness()
  const createBusiness = useCreateBusiness()
  const updateSector = useUpdateBusinessSector()

  // Build a sector lookup map for displaying names
  const sectorMap = useMemo(() => {
    if (!sectors) return new Map<string, string>()
    return new Map(sectors.map((s) => [s.id, s.name]))
  }, [sectors])

  // Filter businesses by selected sector
  const filteredBusinesses = useMemo(() => {
    if (!businesses) return []
    if (!filterSectorId) return businesses
    return businesses.filter((b) => b.sector_id === filterSectorId)
  }, [businesses, filterSectorId])

  const handleSectorUpdate = async (businessId: string, sectorId: string | null) => {
    try {
      await updateSector.mutateAsync({ businessId, sectorId })
      toast.success('Sector updated')
      setEditingSectorId(null)
    } catch (error) {
      console.error('Failed to update sector:', error)
      toast.error('Failed to update sector')
    }
  }

  const startEditingSector = (businessId: string, currentSectorId: string | null) => {
    setEditingSectorId(businessId)
    setPendingSectorId(currentSectorId)
  }

  const cancelEditingSector = () => {
    setEditingSectorId(null)
    setPendingSectorId(null)
  }

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBusinessName.trim()) return
    try {
      await createBusiness.mutateAsync(newBusinessName.trim())
      toast.success('Business created successfully!')
      setNewBusinessName('')
    } catch (error) {
      console.error('Failed to create business:', error)
      toast.error('Failed to create business. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <img
              src="/ubt-logo.png"
              alt="Universal Business Team"
              className="h-12 mx-auto mb-2"
            />
            <div className="flex items-center justify-center gap-2">
              <CardTitle>Monthly Business Scorecard</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/portfolio')}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Portfolio
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateBusiness} className="mb-4 flex gap-2">
              <Input
                type="text"
                placeholder="New business name"
                value={newBusinessName}
                onChange={(e) => setNewBusinessName(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={createBusiness.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </form>

            {/* Sector filter */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <SectorSelect
                    value={filterSectorId}
                    onChange={setFilterSectorId}
                    placeholder="Filter by sector"
                    allowClear
                  />
                </div>
                {filterSectorId && filteredBusinesses.length > 0 && (
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {filteredBusinesses.length} business{filteredBusinesses.length !== 1 ? 'es' : ''}
                  </span>
                )}
              </div>
            </div>

            {isLoading && <p className="text-muted-foreground">Loading...</p>}

            {filteredBusinesses.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Select a business to view history or start a new scorecard:
                </p>
                {filteredBusinesses.map((business) => {
                  const latestScore = latestScores?.get(business.id)
                  const sectorName = business.sector_id ? sectorMap.get(business.sector_id) : null
                  const isEditing = editingSectorId === business.id

                  return (
                    <div
                      key={business.id}
                      className="flex items-center gap-2 rounded-md border border-input p-3"
                    >
                      {/* Main business button */}
                      <Button
                        variant="ghost"
                        className="flex-1 justify-start text-left h-auto py-0 px-2 -ml-2"
                        onClick={() => navigate(`/business/${business.id}`)}
                      >
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="font-medium">{business.name}</span>
                          {!isEditing && (
                            <span className="text-xs text-muted-foreground">
                              {sectorName || 'No sector'}
                            </span>
                          )}
                        </div>
                      </Button>

                      {/* Sector edit section */}
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <div className="w-40">
                            <SectorSelect
                              value={pendingSectorId}
                              onChange={setPendingSectorId}
                              placeholder="Select sector"
                              allowClear
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleSectorUpdate(business.id, pendingSectorId)}
                            disabled={updateSector.isPending}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={cancelEditingSector}
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            startEditingSector(business.id, business.sector_id)
                          }}
                          title="Edit sector"
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}

                      {/* Score badge */}
                      {latestScore && (
                        <Badge className={ragColors[latestScore.rag_status]}>
                          {latestScore.total_score}
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Empty states */}
            {businesses && businesses.length === 0 && (
              <p className="text-muted-foreground">
                No businesses yet. Add one above to get started.
              </p>
            )}

            {businesses && businesses.length > 0 && filteredBusinesses.length === 0 && (
              <p className="text-muted-foreground">
                No businesses in this sector.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
