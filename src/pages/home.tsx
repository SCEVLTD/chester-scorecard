import { useState, useMemo } from 'react'
import { useLocation } from 'wouter'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, LayoutGrid, Upload, Link2, Mail, Trash2, LogOut, Shield, Building2, Layers, Activity } from 'lucide-react'
import { useBusinesses, useCreateBusiness, useDeleteBusiness } from '@/hooks/use-businesses'
import { CompanyEditDialog } from '@/components/admin/company-edit-dialog'
import type { Business } from '@/types/database.types'
import { useLatestScoresPerBusiness } from '@/hooks/use-scorecards'
import { useSectors } from '@/hooks/use-sectors'
import { SectorSelect } from '@/components/sector-select'
import { useAuth } from '@/contexts/auth-context'
import { useOrganisation } from '@/hooks/use-organisation'

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

  const { signOut, userRole } = useAuth()
  const { data: org } = useOrganisation()
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
    // Set flag so login page knows we're intentionally logging out
    sessionStorage.setItem('logout_requested', 'true')
    await signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/velocity-logo.png"
              alt="Velocity"
              className="h-9"
            />
            <div>
              <h1 className="text-lg font-semibold text-foreground">Chester Business Scorecard</h1>
              <p className="text-xs text-muted-foreground">
                {org ? org.name : 'Doing good by doing well'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="mr-1.5 h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/city')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
          >
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium">City Dashboard</span>
          </button>
          <button
            onClick={() => navigate('/eprofile')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
          >
            <Layers className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium">E-Profile</span>
          </button>
          <button
            onClick={() => navigate('/portfolio')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
          >
            <LayoutGrid className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium">Portfolio</span>
          </button>
          {userRole === 'super_admin' && (
            <button
              onClick={() => navigate('/admin/import')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Import</span>
            </button>
          )}
        </div>

        {/* Admin links (Super Admin Only) */}
        {userRole === 'super_admin' && (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/admins')}
              className="text-xs text-muted-foreground"
            >
              <Shield className="mr-1 h-3 w-3" />
              Manage Admins
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/security')}
              className="text-xs text-muted-foreground"
            >
              <Shield className="mr-1 h-3 w-3" />
              Security
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/api-usage')}
              className="text-xs text-muted-foreground"
            >
              <Activity className="mr-1 h-3 w-3" />
              API Usage
            </Button>
          </div>
        )}

        {/* Main Content Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Businesses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add business form (Super Admin Only) */}
            {userRole === 'super_admin' && (
              <>
                <form onSubmit={handleCreateBusiness} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      type="text"
                      placeholder="Business name"
                      value={newBusinessName}
                      onChange={(e) => setNewBusinessName(e.target.value)}
                    />
                    <Input
                      type="email"
                      placeholder="Contact email (optional)"
                      value={newBusinessEmail}
                      onChange={(e) => setNewBusinessEmail(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={createBusiness.isPending} className="w-full md:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Business
                  </Button>
                </form>

                {/* Divider */}
                <div className="border-t" />
              </>
            )}

            {/* Sector filter */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <SectorSelect
                  value={filterSectorId}
                  onChange={setFilterSectorId}
                  placeholder="All sectors"
                  allowClear
                />
              </div>
              {filteredBusinesses.length > 0 && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {filteredBusinesses.length} business{filteredBusinesses.length !== 1 ? 'es' : ''}
                </span>
              )}
            </div>

            {isLoading && <p className="text-muted-foreground text-center py-8">Loading...</p>}

            {filteredBusinesses.length > 0 && (
              <div className="space-y-2">
                {filteredBusinesses.map((business) => {
                  const latestScore = latestScores?.get(business.id)
                  const sectorName = business.sector_id ? sectorMap.get(business.sector_id) : null

                  return (
                    <div
                      key={business.id}
                      className="group flex items-center gap-3 rounded-lg border bg-card p-3 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => navigate(`/business/${business.id}`)}
                    >
                      {/* Score badge - leading */}
                      <div className="flex-shrink-0">
                        {latestScore ? (
                          <Badge className={`${ragColors[latestScore.rag_status]} min-w-[3rem] justify-center`}>
                            {latestScore.total_score}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="min-w-[3rem] justify-center text-muted-foreground">
                            --
                          </Badge>
                        )}
                      </div>

                      {/* Business info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{business.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {sectorName || 'No sector'}
                        </p>
                      </div>

                      {/* Actions - visible on hover */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                            <Link2 className="h-4 w-4 text-primary" />
                          )}
                        </Button>
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
                        {userRole === 'super_admin' && (
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
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Empty states */}
            {businesses && businesses.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No businesses yet. Add one above to get started.
                </p>
              </div>
            )}

            {businesses && businesses.length > 0 && filteredBusinesses.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No businesses in this sector.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
  )
}
