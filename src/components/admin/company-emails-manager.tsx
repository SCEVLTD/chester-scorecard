import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Star, Loader2 } from 'lucide-react'
import {
  useCompanyEmails,
  useAddCompanyEmail,
  useRemoveCompanyEmail,
  useSetPrimaryEmail,
} from '@/hooks/use-company-emails'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CompanyEmailsManagerProps {
  businessId: string
}

export function CompanyEmailsManager({ businessId }: CompanyEmailsManagerProps) {
  const [newEmail, setNewEmail] = useState('')
  const { data: emails = [], isLoading } = useCompanyEmails(businessId)
  const addEmail = useAddCompanyEmail()
  const removeEmail = useRemoveCompanyEmail()
  const setPrimary = useSetPrimaryEmail()

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
        Manage email addresses for this company. The primary email receives login links.
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
    </div>
  )
}
