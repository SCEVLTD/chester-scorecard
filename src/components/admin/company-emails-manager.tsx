import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Star, Loader2, Key } from 'lucide-react'
import {
  useCompanyEmails,
  useAddCompanyEmail,
  useRemoveCompanyEmail,
  useSetPrimaryEmail,
  useCreateCompanyAccount,
} from '@/hooks/use-company-emails'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface CompanyEmailsManagerProps {
  businessId: string
}

export function CompanyEmailsManager({ businessId }: CompanyEmailsManagerProps) {
  const [newEmail, setNewEmail] = useState('')
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const { data: emails = [], isLoading } = useCompanyEmails(businessId)
  const addEmail = useAddCompanyEmail()
  const removeEmail = useRemoveCompanyEmail()
  const setPrimary = useSetPrimaryEmail()
  const createAccount = useCreateCompanyAccount()

  const handleAddEmail = async () => {
    if (!newEmail.trim()) return

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      toast.error('Please enter a valid email address')
      return
    }

    try {
      await addEmail.mutateAsync({ businessId, email: newEmail.trim() })
      setNewEmail('')
      toast.success('Email added successfully')
    } catch (error) {
      console.error('Failed to add email:', error)
      toast.error('Failed to add email')
    }
  }

  const handleRemoveEmail = async (emailId: string) => {
    try {
      await removeEmail.mutateAsync({ emailId, businessId })
      toast.success('Email removed successfully')
    } catch (error) {
      console.error('Failed to remove email:', error)
      toast.error('Failed to remove email')
    }
  }

  const handleSetPrimary = async (emailId: string) => {
    try {
      await setPrimary.mutateAsync({ emailId, businessId })
      toast.success('Primary email updated')
    } catch (error) {
      console.error('Failed to set primary email:', error)
      toast.error('Failed to set primary email')
    }
  }

  const openPasswordDialog = (email: string) => {
    setSelectedEmail(email)
    setPassword('')
    setConfirmPassword('')
    setPasswordDialogOpen(true)
  }

  const handleCreateAccount = async () => {
    if (!selectedEmail || !password) return

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    try {
      const result = await createAccount.mutateAsync({
        email: selectedEmail,
        password,
        businessId,
      })
      toast.success(result.message || 'Account created successfully')
      setPasswordDialogOpen(false)
      setSelectedEmail(null)
      setPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Failed to create account:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create account')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Email Addresses</Label>
        <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Loading emails...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label>Email Addresses</Label>
      <p className="text-sm text-muted-foreground">
        Manage email addresses and login credentials. Click the key icon to set a password for login.
      </p>

      {/* Existing emails list */}
      <div className="space-y-2">
        {emails.map((email) => (
          <div
            key={email.id}
            className="flex items-center gap-2 p-2 border rounded-md bg-muted/50"
          >
            <div className="flex-1 flex items-center gap-2">
              {email.is_primary && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              )}
              <span className="text-sm">{email.email}</span>
              {email.is_primary && (
                <span className="text-xs text-muted-foreground">(Primary)</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => openPasswordDialog(email.email)}
                title="Set login password"
              >
                <Key className="h-4 w-4 text-blue-600" />
              </Button>
              {!email.is_primary && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSetPrimary(email.id)}
                  disabled={setPrimary.isPending}
                  title="Set as primary"
                >
                  <Star className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveEmail(email.id)}
                disabled={removeEmail.isPending || emails.length === 1}
                title={emails.length === 1 ? 'Cannot remove last email' : 'Remove email'}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add new email */}
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="new@example.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAddEmail()
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAddEmail}
          disabled={addEmail.isPending || !newEmail.trim()}
        >
          {addEmail.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </>
          )}
        </Button>
      </div>

      {/* Password dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Login Password</DialogTitle>
            <DialogDescription>
              Set a password for <strong>{selectedEmail}</strong> to log in at /company/login.
              This will create or update the login account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPasswordDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateAccount}
              disabled={createAccount.isPending || !password || password !== confirmPassword}
            >
              {createAccount.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Set Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
