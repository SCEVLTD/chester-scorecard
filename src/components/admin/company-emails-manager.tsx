import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Star, Loader2, Key, Eye, EyeOff, Send, Copy, CheckCircle } from 'lucide-react'
import {
  useCompanyEmails,
  useAddCompanyEmail,
  useRemoveCompanyEmail,
  useSetPrimaryEmail,
  useCreateCompanyAccount,
  useSendCompanyInvite,
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
  businessName?: string
}

export function CompanyEmailsManager({ businessId, businessName }: CompanyEmailsManagerProps) {
  const [newEmail, setNewEmail] = useState('')
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [sendingInviteTo, setSendingInviteTo] = useState<string | null>(null)
  const [setupLinkDialog, setSetupLinkDialog] = useState<{ open: boolean; email: string; link: string }>({
    open: false,
    email: '',
    link: '',
  })
  const [linkCopied, setLinkCopied] = useState(false)

  const { data: emails = [], isLoading } = useCompanyEmails(businessId)
  const addEmail = useAddCompanyEmail()
  const removeEmail = useRemoveCompanyEmail()
  const setPrimary = useSetPrimaryEmail()
  const createAccount = useCreateCompanyAccount()
  const sendInvite = useSendCompanyInvite()

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
    setShowPassword(false)
    setShowConfirmPassword(false)
    setPasswordDialogOpen(true)
  }

  const handleSendInvite = async (email: string) => {
    setSendingInviteTo(email)
    try {
      const result = await sendInvite.mutateAsync({
        email,
        businessId,
        businessName,
      })
      if (result.emailSent) {
        toast.success(`Setup email sent to ${email}`)
      } else if (result.setupLink) {
        // Email not sent (Resend not configured), show the link
        setSetupLinkDialog({
          open: true,
          email,
          link: result.setupLink,
        })
        setLinkCopied(false)
      } else {
        toast.success('Invitation created')
      }
    } catch (error) {
      console.error('Failed to send invite:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send setup email')
    } finally {
      setSendingInviteTo(null)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(setupLinkDialog.link)
      setLinkCopied(true)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
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
        Manage email addresses and login credentials. Use the send icon to email them a password setup link.
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
                onClick={() => handleSendInvite(email.email)}
                disabled={sendingInviteTo === email.email}
                title="Send password setup email"
              >
                {sendingInviteTo === email.email ? (
                  <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                ) : (
                  <Send className="h-4 w-4 text-green-600" />
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => openPasswordDialog(email.email)}
                title="Set login password manually"
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
              Set a password for <strong>{selectedEmail}</strong> to log in at /login.
              This will create or update the login account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-500">Passwords do not match</p>
              )}
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

      {/* Setup link dialog (when email sending is not configured) */}
      <Dialog open={setupLinkDialog.open} onOpenChange={(open) => setSetupLinkDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invitation Created</DialogTitle>
            <DialogDescription>
              Share this link with <strong>{setupLinkDialog.email}</strong> to set up their account.
              The link expires in 7 days.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={setupLinkDialog.link}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
              >
                {linkCopied ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => setSetupLinkDialog(prev => ({ ...prev, open: false }))}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
