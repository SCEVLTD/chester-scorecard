/**
 * Bulk Invitation Panel Component
 *
 * Admin-only panel for sending invitation emails to all businesses
 * with configured email addresses.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Mail, Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { useSendInvitations } from '@/hooks/use-send-invitations'
import { useBusinesses } from '@/hooks/use-businesses'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface CompanyEmail {
  business_id: string
  email: string
  is_primary: boolean
}

export function BulkInvitationPanel() {
  const { data: businesses } = useBusinesses()
  const sendInvitations = useSendInvitations()
  const [showResults, setShowResults] = useState(false)

  // Query to count businesses with emails
  const { data: emailStats } = useQuery({
    queryKey: ['email-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_emails')
        .select('business_id, email')

      if (error) throw error

      const businessesWithEmails = new Set(data.map((e: CompanyEmail) => e.business_id))
      return {
        withEmails: businessesWithEmails.size,
        totalBusinesses: businesses?.length || 0,
        withoutEmails: (businesses?.length || 0) - businessesWithEmails.size,
      }
    },
    enabled: !!businesses,
  })

  const handleSendInvitations = async () => {
    setShowResults(false)
    await sendInvitations.mutateAsync()
    setShowResults(true)
  }

  const results = sendInvitations.data

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Send Invitations
        </CardTitle>
        <CardDescription>
          Send invitation emails to all businesses with configured email addresses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email Statistics */}
        {emailStats && (
          <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium">Businesses with emails</p>
              <p className="text-2xl font-bold">{emailStats.withEmails}</p>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Total businesses</p>
              <p className="text-2xl">{emailStats.totalBusinesses}</p>
            </div>
          </div>
        )}

        {/* Warning if businesses without emails */}
        {emailStats && emailStats.withoutEmails > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {emailStats.withoutEmails} business{emailStats.withoutEmails !== 1 ? 'es' : ''} have no email
              configured and will be skipped.
            </AlertDescription>
          </Alert>
        )}

        {/* Send Button */}
        <Button
          onClick={handleSendInvitations}
          disabled={sendInvitations.isPending || !emailStats || emailStats.withEmails === 0}
          className="w-full"
          size="lg"
        >
          {sendInvitations.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending invitations...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4 mr-2" />
              Send All Invitations
            </>
          )}
        </Button>

        {/* Results Display */}
        {showResults && results && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Results</h4>
              <Badge variant={results.sent === results.total ? 'default' : 'destructive'}>
                {results.sent} / {results.total} sent
              </Badge>
            </div>

            {/* Success Summary */}
            {results.sent > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  Successfully sent {results.sent} invitation{results.sent !== 1 ? 's' : ''} for {results.month}
                </AlertDescription>
              </Alert>
            )}

            {/* Failed Invitations */}
            {results.results.some(r => !r.ok) && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">Failed invitations:</p>
                <div className="space-y-1">
                  {results.results
                    .filter(r => !r.ok)
                    .map((r) => (
                      <Alert key={r.business_id} variant="destructive" className="py-2">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          <strong>{r.business_name}</strong>: {r.error || `HTTP ${r.status}`}
                        </AlertDescription>
                      </Alert>
                    ))}
                </div>
              </div>
            )}

            {/* Configuration Errors */}
            {results.errors && results.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {results.errors.map((err, idx) => (
                      <li key={idx} className="text-sm">{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
