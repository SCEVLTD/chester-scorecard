import { useParams, useLocation } from 'wouter'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useDataRequestByToken } from '@/hooks/use-data-requests'
import { useSubmissionByToken, useCreateCompanySubmission } from '@/hooks/use-company-submissions'
import { companySubmissionSchema, type CompanySubmissionData } from '@/schemas/company-submission'
import { isExpired } from '@/lib/magic-link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle, CheckCircle, Loader2, Calculator, Pencil } from 'lucide-react'

export default function CompanySubmitPage() {
  const { token } = useParams<{ token: string }>()
  const [, navigate] = useLocation()

  const { data: requestData, isLoading: loadingRequest, error: requestError } = useDataRequestByToken(token || '')
  const { data: existingSubmission, isLoading: loadingSubmission } = useSubmissionByToken(token || '')
  const createSubmission = useCreateCompanySubmission()

  // Track if user is overriding auto-calculated net profit
  const [netProfitOverride, setNetProfitOverride] = useState(false)

  const form = useForm<CompanySubmissionData>({
    resolver: zodResolver(companySubmissionSchema) as Resolver<CompanySubmissionData>,
    defaultValues: existingSubmission ? {
      // N/A flags
      revenueNa: existingSubmission.revenue_na || false,
      grossProfitNa: existingSubmission.gross_profit_na || false,
      overheadsNa: existingSubmission.overheads_na || false,
      wagesNa: existingSubmission.wages_na || false,
      // Financial values
      revenueActual: existingSubmission.revenue_actual ?? undefined,
      revenueTarget: existingSubmission.revenue_target ?? undefined,
      grossProfitActual: existingSubmission.gross_profit_actual ?? undefined,
      grossProfitTarget: existingSubmission.gross_profit_target ?? undefined,
      overheadsActual: existingSubmission.overheads_actual ?? undefined,
      overheadsBudget: existingSubmission.overheads_budget ?? undefined,
      netProfitActual: existingSubmission.net_profit_actual ?? undefined,
      netProfitTarget: existingSubmission.net_profit_target ?? undefined,
      netProfitOverride: existingSubmission.net_profit_override,
      totalWages: existingSubmission.total_wages ?? undefined,
      productivityBenchmark: existingSubmission.productivity_benchmark ?? undefined,
      companyBiggestOpportunity: existingSubmission.company_biggest_opportunity || '',
      companyBiggestRisk: existingSubmission.company_biggest_risk || '',
      companyChallenges: existingSubmission.company_challenges || '',
      companyWins: existingSubmission.company_wins || '',
      submitterName: existingSubmission.submitted_by_name || '',
      submitterEmail: existingSubmission.submitted_by_email || '',
    } : {
      revenueNa: false,
      grossProfitNa: false,
      overheadsNa: false,
      wagesNa: false,
    },
  })

  // Watch N/A flags
  const revenueNa = useWatch({ control: form.control, name: 'revenueNa' })
  const grossProfitNa = useWatch({ control: form.control, name: 'grossProfitNa' })
  const overheadsNa = useWatch({ control: form.control, name: 'overheadsNa' })
  const wagesNa = useWatch({ control: form.control, name: 'wagesNa' })

  // Watch values for auto-calculation
  const grossProfitActual = useWatch({ control: form.control, name: 'grossProfitActual' })
  const grossProfitTarget = useWatch({ control: form.control, name: 'grossProfitTarget' })
  const overheadsActual = useWatch({ control: form.control, name: 'overheadsActual' })
  const overheadsBudget = useWatch({ control: form.control, name: 'overheadsBudget' })
  const totalWages = useWatch({ control: form.control, name: 'totalWages' })

  // Calculate productivity actual (GP / Wages)
  const productivityActual = totalWages && totalWages > 0
    ? (Number(grossProfitActual) / Number(totalWages)).toFixed(2)
    : '0.00'

  // Auto-calculate Net Profit when not overridden
  useEffect(() => {
    if (!netProfitOverride) {
      const gpActual = Number(grossProfitActual) || 0
      const ohActual = Number(overheadsActual) || 0
      const gpTarget = Number(grossProfitTarget) || 0
      const ohBudget = Number(overheadsBudget) || 0

      form.setValue('netProfitActual', gpActual - ohActual)
      form.setValue('netProfitTarget', gpTarget - ohBudget)
    }
  }, [grossProfitActual, overheadsActual, grossProfitTarget, overheadsBudget, netProfitOverride, form])

  // Update form when existing submission loads
  useEffect(() => {
    if (existingSubmission && !form.formState.isDirty) {
      setNetProfitOverride(existingSubmission.net_profit_override || false)
      form.reset({
        // N/A flags
        revenueNa: existingSubmission.revenue_na || false,
        grossProfitNa: existingSubmission.gross_profit_na || false,
        overheadsNa: existingSubmission.overheads_na || false,
        wagesNa: existingSubmission.wages_na || false,
        // Financial values
        revenueActual: existingSubmission.revenue_actual ?? undefined,
        revenueTarget: existingSubmission.revenue_target ?? undefined,
        grossProfitActual: existingSubmission.gross_profit_actual ?? undefined,
        grossProfitTarget: existingSubmission.gross_profit_target ?? undefined,
        overheadsActual: existingSubmission.overheads_actual ?? undefined,
        overheadsBudget: existingSubmission.overheads_budget ?? undefined,
        netProfitActual: existingSubmission.net_profit_actual ?? undefined,
        netProfitTarget: existingSubmission.net_profit_target ?? undefined,
        netProfitOverride: existingSubmission.net_profit_override,
        totalWages: existingSubmission.total_wages ?? undefined,
        productivityBenchmark: existingSubmission.productivity_benchmark ?? undefined,
        companyBiggestOpportunity: existingSubmission.company_biggest_opportunity || '',
        companyBiggestRisk: existingSubmission.company_biggest_risk || '',
        companyChallenges: existingSubmission.company_challenges || '',
        companyWins: existingSubmission.company_wins || '',
        submitterName: existingSubmission.submitted_by_name || '',
        submitterEmail: existingSubmission.submitted_by_email || '',
      })
    }
  }, [existingSubmission, form])

  const onSubmit = async (data: CompanySubmissionData) => {
    if (!requestData) return

    try {
      await createSubmission.mutateAsync({
        dataRequestId: requestData.dataRequest.id,
        data: {
          ...data,
          netProfitOverride,
        },
      })
      navigate(`/submit/${token}/success`)
    } catch (error) {
      console.error('Submission error:', error)
      toast.error('Failed to submit financial data. Please check your connection and try again.')
    }
  }

  // Handler for enabling manual net profit override
  const enableNetProfitOverride = () => {
    setNetProfitOverride(true)
    form.setValue('netProfitOverride', true)
  }

  // Loading state
  if (loadingRequest || loadingSubmission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" />
          <p className="mt-2 text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Invalid or not found
  if (requestError || !requestData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h2 className="mt-4 text-xl font-semibold text-slate-900">Invalid Link</h2>
              <p className="mt-2 text-slate-600">
                This link is invalid or has been removed. Please contact your consultant for a new link.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { dataRequest, business } = requestData

  // Expired
  if (isExpired(dataRequest.expires_at)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
              <h2 className="mt-4 text-xl font-semibold text-slate-900">Link Expired</h2>
              <p className="mt-2 text-slate-600">
                This data request has expired. Please contact your consultant for a new link.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Already used by consultant
  if (dataRequest.status === 'used') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h2 className="mt-4 text-xl font-semibold text-slate-900">Data Already Used</h2>
              <p className="mt-2 text-slate-600">
                Your financial data has been used to create the scorecard. Thank you for your submission.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-')
    const date = new Date(parseInt(year), parseInt(monthNum) - 1)
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
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
              <p className="text-xs text-muted-foreground mt-1">
                Chester Brethren Business Group
              </p>
            </div>
            <CardTitle className="text-2xl">Chester Business Scorecard</CardTitle>
            <p className="text-lg text-muted-foreground">Financial Data Submission</p>
            <CardDescription className="text-base">
              <span className="font-medium text-slate-900">{business.name}</span>
              <span className="mx-2">-</span>
              <span>{formatMonth(dataRequest.month)}</span>
            </CardDescription>
            {existingSubmission && (
              <div className="mt-2 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
                <AlertCircle className="h-4 w-4" />
                You previously submitted data. You can update it below.
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Revenue */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-slate-900">Revenue</h3>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <Checkbox
                      checked={revenueNa}
                      onCheckedChange={(checked) => form.setValue('revenueNa', checked === true)}
                    />
                    <span>N/A</span>
                  </label>
                </div>
                {revenueNa ? (
                  <div className="p-4 bg-slate-50 rounded-lg text-center text-sm text-slate-500">
                    Revenue data not applicable to this business
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-600">Actual</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">£</span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-7"
                          placeholder="0"
                          {...form.register('revenueActual')}
                        />
                      </div>
                      {form.formState.errors.revenueActual && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.revenueActual.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm text-slate-600">Target</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">£</span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-7"
                          placeholder="0"
                          {...form.register('revenueTarget')}
                        />
                      </div>
                      {form.formState.errors.revenueTarget && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.revenueTarget.message}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Gross Profit */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-slate-900">Gross Profit</h3>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <Checkbox
                      checked={grossProfitNa}
                      onCheckedChange={(checked) => form.setValue('grossProfitNa', checked === true)}
                    />
                    <span>N/A</span>
                  </label>
                </div>
                {grossProfitNa ? (
                  <div className="p-4 bg-slate-50 rounded-lg text-center text-sm text-slate-500">
                    Gross Profit data not applicable to this business
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-600">Actual</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">£</span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-7"
                          placeholder="0"
                          {...form.register('grossProfitActual')}
                        />
                      </div>
                      {form.formState.errors.grossProfitActual && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.grossProfitActual.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm text-slate-600">Target</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">£</span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-7"
                          placeholder="0"
                          {...form.register('grossProfitTarget')}
                        />
                      </div>
                      {form.formState.errors.grossProfitTarget && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.grossProfitTarget.message}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Overheads */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-slate-900">Overheads</h3>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <Checkbox
                      checked={overheadsNa}
                      onCheckedChange={(checked) => form.setValue('overheadsNa', checked === true)}
                    />
                    <span>N/A</span>
                  </label>
                </div>
                {overheadsNa ? (
                  <div className="p-4 bg-slate-50 rounded-lg text-center text-sm text-slate-500">
                    Overheads data not applicable to this business
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-600">Actual</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">£</span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-7"
                          placeholder="0"
                          {...form.register('overheadsActual')}
                        />
                      </div>
                      {form.formState.errors.overheadsActual && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.overheadsActual.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm text-slate-600">Budget</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">£</span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-7"
                          placeholder="0"
                          {...form.register('overheadsBudget')}
                        />
                      </div>
                      {form.formState.errors.overheadsBudget && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.overheadsBudget.message}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* EBITDA - Auto-calculated or Override (hidden if GP or Overheads are N/A) */}
              {(grossProfitNa || overheadsNa) ? (
                <div className="space-y-3">
                  <h3 className="font-medium text-slate-900">EBITDA</h3>
                  <div className="p-4 bg-slate-50 rounded-lg text-center text-sm text-slate-500">
                    EBITDA cannot be calculated when Gross Profit or Overheads are marked as N/A
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-slate-900">EBITDA</h3>
                    {!netProfitOverride ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <Calculator className="h-3 w-3" />
                          Auto-calculated (GP - Overheads)
                        </span>
                        <button
                          type="button"
                          onClick={enableNetProfitOverride}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Pencil className="h-3 w-3" />
                          Override
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-amber-600 flex items-center gap-1">
                        <Pencil className="h-3 w-3" />
                        Manual entry
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-600">Actual</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">£</span>
                        <Input
                          type="number"
                          step="0.01"
                          className={`pl-7 ${!netProfitOverride ? 'bg-slate-50' : ''}`}
                          placeholder="0"
                          readOnly={!netProfitOverride}
                          {...form.register('netProfitActual')}
                        />
                      </div>
                      {form.formState.errors.netProfitActual && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.netProfitActual.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm text-slate-600">Target</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">£</span>
                        <Input
                          type="number"
                          step="0.01"
                          className={`pl-7 ${!netProfitOverride ? 'bg-slate-50' : ''}`}
                          placeholder="0"
                          readOnly={!netProfitOverride}
                          {...form.register('netProfitTarget')}
                        />
                      </div>
                      {form.formState.errors.netProfitTarget && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.netProfitTarget.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Wages & Productivity */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-slate-900">Wages & Productivity</h3>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <Checkbox
                      checked={wagesNa}
                      onCheckedChange={(checked) => form.setValue('wagesNa', checked === true)}
                    />
                    <span>N/A</span>
                  </label>
                </div>
                {wagesNa ? (
                  <div className="p-4 bg-slate-50 rounded-lg text-center text-sm text-slate-500">
                    Wages & Productivity data not applicable to this business
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-slate-600">Total Wages</label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">£</span>
                          <Input
                            type="number"
                            step="0.01"
                            className="pl-7"
                            placeholder="0"
                            {...form.register('totalWages')}
                          />
                        </div>
                        {form.formState.errors.totalWages && (
                          <p className="text-sm text-red-500 mt-1">{form.formState.errors.totalWages.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm text-slate-600">Productivity Benchmark (Target)</label>
                        <Input
                          type="number"
                          step="0.01"
                          className="mt-1"
                          placeholder="e.g., 2.5"
                          {...form.register('productivityBenchmark')}
                        />
                        <p className="text-xs text-slate-500 mt-1">GP/Wages ratio target (typically 1.5-4.0)</p>
                        {form.formState.errors.productivityBenchmark && (
                          <p className="text-sm text-red-500 mt-1">{form.formState.errors.productivityBenchmark.message}</p>
                        )}
                      </div>
                    </div>
                    {/* Calculated Productivity Actual */}
                    {Number(totalWages) > 0 && !grossProfitNa && (
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600 flex items-center gap-1">
                            <Calculator className="h-3 w-3" />
                            Productivity Actual (GP/Wages)
                          </span>
                          <span className="font-semibold text-slate-900">{productivityActual}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Business Insights (Optional - helps your consultant) */}
              <div className="space-y-4 pt-6 border-t">
                <div>
                  <h3 className="font-medium text-slate-900">Business Insights</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Help your consultant understand your business better (all optional)
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-600">
                      Biggest Opportunity (next 90 days)
                    </label>
                    <Textarea
                      className="mt-1"
                      placeholder="What do you see as the biggest opportunity for growth or improvement?"
                      rows={3}
                      {...form.register('companyBiggestOpportunity')}
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-600">
                      Biggest Risk or Concern
                    </label>
                    <Textarea
                      className="mt-1"
                      placeholder="What are you most worried about right now?"
                      rows={3}
                      {...form.register('companyBiggestRisk')}
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-600">
                      Current Challenges
                    </label>
                    <Textarea
                      className="mt-1"
                      placeholder="What challenges are you currently facing?"
                      rows={3}
                      {...form.register('companyChallenges')}
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-600">
                      Recent Wins or Positive Developments
                    </label>
                    <Textarea
                      className="mt-1"
                      placeholder="What's going well? Any wins to celebrate?"
                      rows={3}
                      {...form.register('companyWins')}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-medium text-slate-900">Your Details (Optional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-600">Name</label>
                    <Input
                      type="text"
                      className="mt-1"
                      placeholder="Your name"
                      {...form.register('submitterName')}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Email</label>
                    <Input
                      type="email"
                      className="mt-1"
                      placeholder="your@email.com"
                      {...form.register('submitterEmail')}
                    />
                    {form.formState.errors.submitterEmail && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.submitterEmail.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={createSubmission.isPending}
                >
                  {createSubmission.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : existingSubmission ? (
                    'Update Submission'
                  ) : (
                    'Submit Financial Data'
                  )}
                </Button>

                {createSubmission.isError && (
                  <p className="text-sm text-red-500 mt-2 text-center">
                    Failed to submit. Please try again.
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-500 mt-4">
          Your data will be securely shared with the Chester business community.
        </p>
      </div>
    </div>
  )
}
