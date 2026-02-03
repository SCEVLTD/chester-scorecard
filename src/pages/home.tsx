import { useState, useMemo } from 'react'
import { useLocation } from 'wouter'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, LayoutGrid, Upload, Link2, Mail, Trash2, LogOut, Shield } from 'lucide-react'
import { useBusinesses, useCreateBusiness, useDeleteBusiness } from '@/hooks/use-businesses'
import { CompanyEditDialog } from '@/components/admin/company-edit-dialog'
import type { Business } from '@/types/database.types'
import { useLatestScoresPerBusiness } from '@/hooks/use-scorecards'
import { useSectors } from '@/hooks/use-sectors'
import { SectorSelect } from '@/components/sector-select'
import { useAuth } from '@/contexts/auth-context'

const ragColors: Record<string, string> = {
  green: 'bg-green-500 hover:bg-green-600',
  amber: 'bg-amber-500 hover:bg-amber-600',
  red: 'bg-red-500 hover:bg-red-600',
}

export function HomePage() {
  const [, navigate] = useLocation()
  const [newBusinessName, setNewBusinessName] = useState('')
  const [newBusinessEmail, setNewBusinessEmail] = useState('')
  const [filterSectorId, setFilterSectorId] = useState<string | null>(null)
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null)

  const { signOut } = useAuth()
  const { data: businesses, isLoading } = useBusinesses()
  const { data: sectors } = useSectors()
  const { data: latestScores } = useLatestScoresPerBusiness()
  const createBusiness = useCreateBusiness()
  const deleteBusiness = useDeleteBusiness()

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

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBusinessName.trim()) return
    try {
      await createBusiness.mutateAsync({
        name: newBusinessName.trim(),
        contact_email: newBusinessEmail.trim() || undefined,
      })
      toast.success('Business created successfully!')
      setNewBusinessName('')
      setNewBusinessEmail('')
    } catch (error) {
      console.error('Failed to create business:', error)
      toast.error('Failed to create business. Please try again.')
    }
  }

  const sendLoginLink = (businessName: string, email: string | null) => {
    const loginUrl = `${window.location.origin}/login`
    if (email) {
      const subject = encodeURIComponent(`Your Chester Business Scorecard Access - ${businessName}`)
      const body = encodeURIComponent(`Hi,\n\nYou can access your ${businessName} business scorecard using the link below:\n\n${loginUrl}\n\nSimply enter your email address and we'll send you a secure login link.\n\nThanks`)
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
      toast.success(`Opening email for ${businessName}`)
    } else {
      navigator.clipboard.writeText(loginUrl)
      toast.success(`Login link copied`)
    }
  }

  const handleDeleteBusiness = async (businessId: string, businessName: string) => {
    if (!confirm(`Delete "${businessName}"? This cannot be undone.`)) return
    try {
      await deleteBusiness.mutateAsync(businessId)
      toast.success(`${businessName} deleted`)
    } catch (error) {
      console.error('Failed to delete business:', error)
      toast.error('Failed to delete business')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="flex flex-col items-center mb-4">
              <img
                src="/velocity-logo.png"
                alt="Velocity"
                className="h-10 mb-2"
              />
              <p className="text-sm text-muted-foreground">
                Doing good by doing well
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CardTitle>Chester Business Scorecard</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/portfolio')}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Portfolio
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/import')}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/admins')}
              >
                <Shield className="mr-2 h-4 w-4" />
                Admins
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateBusiness} className="mb-4 space-y-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Business name"
                  value={newBusinessName}
                  onChange={(e) => setNewBusinessName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="email"
                  placeholder="Contact email"
                  value={newBusinessEmail}
                  onChange={(e) => setNewBusinessEmail(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={createBusiness.isPending}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
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
                          <span className="text-xs text-muted-foreground">
                            {sectorName || 'No sector'}
                          </span>
                        </div>
                      </Button>

                      {/* Send/copy submission link */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          sendLoginLink(business.name, business.contact_email)
                        }}
                        title={business.contact_email ? `Email link to ${business.contact_email}` : 'Copy submission link'}
                      >
                        {business.contact_email ? (
                          <Mail className="h-4 w-4 text-green-600" />
                        ) : (
                          <Link2 className="h-4 w-4 text-blue-600" />
                        )}
                      </Button>

                      {/* Edit button - opens full edit dialog */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingBusiness(business)
                        }}
                        title="Edit company details"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>

                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteBusiness(business.id, business.name)
                        }}
                        title="Delete business"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>

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

        {/* Edit dialog */}
        {editingBusiness && (
          <CompanyEditDialog
            business={editingBusiness}
            open={!!editingBusiness}
            onOpenChange={(open) => {
              if (!open) setEditingBusiness(null)
            }}
          />
        )}
      </div>
    </div>
  )
}
