/**
 * Data & Privacy Section
 *
 * GDPR controls for business users to export or delete their data.
 * - "Export My Data" triggers the export-user-data Edge Function
 * - "Delete My Account" triggers the delete-user-data Edge Function after confirmation
 *
 * Visibility:
 * - business_user: sees both Export and Delete buttons
 * - super_admin: sees Export button only (should not delete their own admin account here)
 * - consultant: hidden entirely
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { useLocation } from 'wouter'
import { Download, Trash2, Loader2, ShieldAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'

export function DataPrivacySection(): React.ReactElement | null {
  const { session, userRole, businessId, signOut } = useAuth()
  const [, navigate] = useLocation()
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // Only show for business_user and super_admin
  if (userRole === 'consultant' || !userRole) {
    return null
  }

  // Must have a businessId to export/delete
  if (!businessId) {
    return null
  }

  const handleExportData = async (): Promise<void> => {
    if (!session?.access_token) {
      toast.error('You must be signed in to export data.')
      return
    }

    setIsExporting(true)
    try {
      const { data, error } = await supabase.functions.invoke('export-user-data', {
        body: { business_id: businessId },
      })

      if (error) {
        throw error
      }

      // The Edge Function returns JSON directly via functions.invoke
      // Create a downloadable file from the response
      const jsonString = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const dateStr = new Date().toISOString().split('T')[0]
      const filename = `business-data-export-${dateStr}.json`

      // Trigger download using native approach
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Your data export has been downloaded.')
    } catch (err) {
      console.error('Export failed:', err)
      toast.error('Failed to export your data. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async (): Promise<void> => {
    if (!session?.access_token) {
      toast.error('You must be signed in to delete your account.')
      return
    }

    setIsDeleting(true)
    try {
      const { data, error } = await supabase.functions.invoke('delete-user-data', {
        body: {
          business_id: businessId,
          confirm: true,
        },
      })

      if (error) {
        throw error
      }

      if (data?.success) {
        toast.success('Your account and all data have been permanently deleted.')

        // Sign out and redirect to login
        await signOut()
        navigate('/login')
      } else {
        throw new Error('Deletion did not complete successfully.')
      }
    } catch (err) {
      console.error('Delete failed:', err)
      toast.error('Failed to delete your account. Please try again or contact support.')
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setDeleteConfirmText('')
    }
  }

  const handleOpenDeleteDialog = (): void => {
    setDeleteConfirmText('')
    setDeleteDialogOpen(true)
  }

  const isDeleteConfirmed = deleteConfirmText === 'DELETE'

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Data &amp; Privacy
          </CardTitle>
          <CardDescription>
            Manage your personal data in accordance with GDPR
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export Data */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Export your data</p>
              <p className="text-sm text-muted-foreground">
                Download a copy of all your business data as a JSON file.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleExportData}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export My Data
            </Button>
          </div>

          {/* Delete Account - business_user only */}
          {userRole === 'business_user' && (
            <>
              <div className="border-t" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-destructive">Delete your account</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently remove your business data, scorecards, and account. This cannot be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleOpenDeleteDialog}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete My Account
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your business data, scorecards, and account.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Type <span className="font-mono text-destructive">DELETE</span> to confirm:
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              autoComplete="off"
              autoFocus
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              onClick={() => setDeleteConfirmText('')}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={!isDeleteConfirmed || isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {isDeleting ? 'Deleting...' : 'Permanently Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
