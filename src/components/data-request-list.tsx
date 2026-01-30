import { useBusinessDataRequests } from '@/hooks/use-data-requests'
import { buildMagicLink, formatExpiry, isExpired } from '@/lib/magic-link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Clock, Copy, ExternalLink, FileCheck, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'wouter'

interface DataRequestListProps {
  businessId: string
}

export function DataRequestList({ businessId }: DataRequestListProps) {
  const { data: requests, isLoading } = useBusinessDataRequests(businessId)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [, navigate] = useLocation()

  const handleCopy = async (token: string, id: string) => {
    try {
      const link = buildMagicLink(token)
      await navigator.clipboard.writeText(link)
      setCopiedId(id)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
      toast.error('Failed to copy link. Please try manually.')
    }
  }

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-')
    const date = new Date(parseInt(year), parseInt(monthNum) - 1)
    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  }

  const getStatusBadge = (status: string, expiresAt: string) => {
    if (status === 'used') {
      return <Badge variant="secondary" className="bg-slate-100">Used</Badge>
    }
    if (isExpired(expiresAt)) {
      return <Badge variant="destructive">Expired</Badge>
    }
    if (status === 'submitted') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Submitted</Badge>
    }
    return <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!requests || requests.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-2">No data requests yet.</p>
    )
  }

  return (
    <div className="space-y-2">
      {requests.map((request) => {
        const expired = isExpired(request.expires_at)
        const canCreateScorecard = request.status === 'submitted' && !expired

        return (
          <div
            key={request.id}
            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="font-medium text-sm">{formatMonth(request.month)}</span>
                <span className="text-xs text-slate-500">
                  {request.status === 'pending' && !expired && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatExpiry(request.expires_at)}
                    </span>
                  )}
                  {request.status === 'submitted' && (
                    <span className="flex items-center gap-1 text-green-600">
                      <FileCheck className="h-3 w-3" />
                      Data received
                    </span>
                  )}
                  {request.created_by && (
                    <span className="text-slate-400">by {request.created_by}</span>
                  )}
                </span>
              </div>
              {getStatusBadge(request.status, request.expires_at)}
            </div>

            <div className="flex items-center gap-2">
              {request.status === 'pending' && !expired && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(request.token, request.id)}
                  className="h-8"
                >
                  {copiedId === request.id ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Link
                    </>
                  )}
                </Button>
              )}

              {canCreateScorecard && (
                <Button
                  size="sm"
                  onClick={() => navigate(`/business/${businessId}/scorecard?month=${request.month}`)}
                  className="h-8"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Create Scorecard
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
