import { useParams } from 'wouter'
import { useDataRequestByToken } from '@/hooks/use-data-requests'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, Loader2 } from 'lucide-react'

export default function SubmissionSuccessPage() {
  const { token } = useParams<{ token: string }>()
  const { data: requestData, isLoading } = useDataRequestByToken(token || '')

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-')
    const date = new Date(parseInt(year), parseInt(monthNum) - 1)
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center">
            <img
              src="/velocity-logo.png"
              alt="Velocity"
              className="h-10 mx-auto mb-4"
            />
            <p className="text-xs text-muted-foreground mb-4">
              Chester Brethren Business Group
            </p>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="mt-4 text-2xl font-semibold text-slate-900">
              Thank You!
            </h2>
            <p className="mt-2 text-slate-600">
              Your financial data has been submitted successfully.
            </p>

            {requestData && (
              <div className="mt-6 p-4 bg-slate-50 rounded-lg text-left">
                <div className="text-sm text-slate-600">
                  <p><span className="font-medium">Business:</span> {requestData.business.name}</p>
                  <p><span className="font-medium">Month:</span> {formatMonth(requestData.dataRequest.month)}</p>
                </div>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                Your consultant will review the data and complete the business scorecard.
                You can close this page now.
              </p>
            </div>

            <p className="mt-6 text-xs text-slate-400">
              Need to make changes? Use the same link to update your submission.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
