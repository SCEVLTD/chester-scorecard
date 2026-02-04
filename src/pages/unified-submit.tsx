import { useMemo, useEffect, useState } from 'react'
import { useParams, useLocation } from 'wouter'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, subMonths, startOfMonth } from 'date-fns'
import { toast } from 'sonner'
import { Loader2, CheckCircle } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { useAuth } from '@/contexts/auth-context'
import { useBusinesses } from '@/hooks/use-businesses'
import { useCreateUnifiedSubmission, useUnifiedSubmission } from '@/hooks/use-unified-submission'
import { unifiedSubmissionSchema, type UnifiedSubmissionData } from '@/schemas/unified-submission'
import {
  LEADERSHIP_OPTIONS,
  MARKET_DEMAND_OPTIONS,
  MARKETING_OPTIONS,
  PRODUCT_OPTIONS,
  SUPPLIER_OPTIONS,
  SALES_OPTIONS,
} from '@/lib/scoring'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function UnifiedSubmitPage() {
  const params = useParams<{ businessId: string }>()
  const [, navigate] = useLocation()
  const { businessId: authBusinessId } = useAuth()

  // Use URL param or fallback to auth context businessId
  const businessId = params.businessId || authBusinessId

  const { data: businesses, isLoading: loadingBusinesses } = useBusinesses()
  const createSubmission = useCreateUnifiedSubmission()

  // Track selected month for existing submission lookup
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  // Query for existing submission
  const { data: existingSubmission, isLoading: loadingSubmission } = useUnifiedSubmission(
    businessId || undefined,
    selectedMonth || undefined
  )

  const form = useForm<UnifiedSubmissionData>({
    resolver: zodResolver(unifiedSubmissionSchema) as Resolver<UnifiedSubmissionData>,
    defaultValues: {
      month: '',
      revenueActual: 0,
      revenueTarget: 0,
      grossProfitActual: 0,
      grossProfitTarget: 0,
      overheadsActual: 0,
      overheadsBudget: 0,
      netProfitActual: 0,
      netProfitTarget: 0,
      netProfitOverride: false,
      totalWages: 0,
      productivityBenchmark: 2.0,
      outboundCalls: undefined,
      firstOrders: undefined,
      leadership: undefined,
      marketDemand: undefined,
      marketing: undefined,
      productStrength: undefined,
      supplierStrength: undefined,
      salesExecution: undefined,
      companyWins: '',
      companyChallenges: '',
      companyBiggestOpportunity: '',
      companyBiggestRisk: '',
    },
  })

  // Update form when existing submission loads
  useEffect(() => {
    if (existingSubmission && !form.formState.isDirty) {
      form.reset({
        month: selectedMonth,
        revenueActual: existingSubmission.revenue_actual ?? undefined,
        revenueTarget: existingSubmission.revenue_target ?? undefined,
        grossProfitActual: existingSubmission.gross_profit_actual ?? undefined,
        grossProfitTarget: existingSubmission.gross_profit_target ?? undefined,
        overheadsActual: existingSubmission.overheads_actual ?? undefined,
        overheadsBudget: existingSubmission.overheads_budget ?? undefined,
        netProfitActual: existingSubmission.net_profit_actual ?? undefined,
        netProfitTarget: existingSubmission.net_profit_target ?? undefined,
        netProfitOverride: existingSubmission.net_profit_override ?? undefined,
        totalWages: existingSubmission.total_wages ?? undefined,
        productivityBenchmark: existingSubmission.productivity_benchmark ?? undefined,
        outboundCalls: existingSubmission.outbound_calls ?? undefined,
        firstOrders: existingSubmission.first_orders ?? undefined,
        leadership: existingSubmission.leadership as UnifiedSubmissionData['leadership'] ?? undefined,
        marketDemand: existingSubmission.market_demand as UnifiedSubmissionData['marketDemand'] ?? undefined,
        marketing: existingSubmission.marketing as UnifiedSubmissionData['marketing'] ?? undefined,
        productStrength: existingSubmission.product_strength as UnifiedSubmissionData['productStrength'] ?? undefined,
        supplierStrength: existingSubmission.supplier_strength as UnifiedSubmissionData['supplierStrength'] ?? undefined,
        salesExecution: existingSubmission.sales_execution as UnifiedSubmissionData['salesExecution'] ?? undefined,
        companyWins: existingSubmission.company_wins || '',
        companyChallenges: existingSubmission.company_challenges || '',
        companyBiggestOpportunity: existingSubmission.company_biggest_opportunity || '',
        companyBiggestRisk: existingSubmission.company_biggest_risk || '',
      })
    }
  }, [existingSubmission, selectedMonth, form])

  // Generate last 12 months for selection
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(startOfMonth(new Date()), i)
      return {
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy'),
      }
    })
  }, [])

  const onSubmit = async (data: UnifiedSubmissionData) => {
    if (!businessId) {
      toast.error('Business ID not found')
      return
    }

    try {
      const result = await createSubmission.mutateAsync({
        businessId,
        data: {
          ...data,
          // Always manual entry in simplified form
          netProfitOverride: true,
        },
      })
      toast.success(`Submission saved! Score: ${result.score}`)
      navigate(`/business/${businessId}`)
    } catch (error) {
      console.error('Submission error:', error)
      toast.error('Failed to submit data. Please check your connection and try again.')
    }
  }

  const business = businesses?.find((b) => b.id === businessId)

  // Loading state
  if (loadingBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" />
          <p className="mt-2 text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  // No business found
  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-slate-900">Business Not Found</h2>
              <p className="mt-2 text-slate-600">
                The business you are looking for does not exist or you do not have access.
              </p>
              <Button onClick={() => navigate('/')} className="mt-4">
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <PageHeader
          backTo={`/business/${businessId}`}
          backText="Back"
          showTagline={false}
        />

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
            <CardTitle className="text-2xl">Monthly Data Submission</CardTitle>
            <CardDescription className="text-base">
              <span className="font-medium text-slate-900">{business.name}</span>
            </CardDescription>
            {existingSubmission && (
              <div className="mt-2 flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
                <CheckCircle className="h-4 w-4" />
                You previously submitted data for this month. You can update it below.
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Month Selection */}
              <div className="space-y-3">
                <Label htmlFor="month">Month Being Reported</Label>
                <Controller
                  name="month"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value)
                        setSelectedMonth(value)
                      }}
                    >
                      <SelectTrigger id="month" className="w-full">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.month && (
                  <p className="text-sm text-red-500">{form.formState.errors.month.message}</p>
                )}
              </div>

              {loadingSubmission && selectedMonth && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking for existing submission...
                </div>
              )}

              {/* Financial Section - Simplified to Revenue + EBITDA only */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-lg text-slate-900">Financial Performance (20 pts)</h3>

                {/* Revenue */}
                <div className="space-y-3">
                  <h4 className="font-medium text-slate-900">Revenue</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-slate-600">Actual</Label>
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
                      <Label className="text-sm text-slate-600">Target</Label>
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
                </div>

                {/* Gross Profit - Hidden from simplified form */}

                {/* Overheads - Hidden from simplified form */}

                {/* EBITDA - Manual entry only in simplified form */}
                <div className="space-y-3">
                  <h4 className="font-medium text-slate-900">EBITDA</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-slate-600">Actual</Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">£</span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-7"
                          placeholder="0"
                          {...form.register('netProfitActual')}
                        />
                      </div>
                      {form.formState.errors.netProfitActual && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.netProfitActual.message}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm text-slate-600">Target</Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">£</span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-7"
                          placeholder="0"
                          {...form.register('netProfitTarget')}
                        />
                      </div>
                      {form.formState.errors.netProfitTarget && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.netProfitTarget.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Wages & Productivity - Hidden from simplified form */}
              </div>

              {/* Lead KPIs Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-lg text-slate-900">Lead KPIs (Optional)</h3>
                <p className="text-sm text-slate-500">Track leading indicators for sales activity</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-slate-600">Outbound Calls</Label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      className="mt-1"
                      placeholder="0"
                      {...form.register('outboundCalls')}
                    />
                    {form.formState.errors.outboundCalls && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.outboundCalls.message}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-slate-600">First Orders</Label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      className="mt-1"
                      placeholder="0"
                      {...form.register('firstOrders')}
                    />
                    {form.formState.errors.firstOrders && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.firstOrders.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Qualitative Scoring Section */}
              <div className="space-y-6 pt-4 border-t">
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Business Self-Assessment (60 pts)</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Rate your business performance across six key dimensions
                  </p>
                </div>

                {/* Leadership (10 pts) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-slate-900">Leadership & Alignment</h4>
                    <span className="text-xs text-slate-500">10 pts max</span>
                  </div>
                  <Controller
                    name="leadership"
                    control={form.control}
                    render={({ field }) => (
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="space-y-2"
                      >
                        {LEADERSHIP_OPTIONS.map((option) => (
                          <div key={option.value} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50">
                            <RadioGroupItem value={option.value} id={`leadership-${option.value}`} />
                            <Label htmlFor={`leadership-${option.value}`} className="flex-1 cursor-pointer">
                              <span>{option.label}</span>
                              <span className="ml-2 text-xs text-slate-500">({option.points} pts)</span>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  />
                  {form.formState.errors.leadership && (
                    <p className="text-sm text-red-500">{form.formState.errors.leadership.message}</p>
                  )}
                </div>

                {/* Market Demand (7.5 pts) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-slate-900">Market Demand</h4>
                    <span className="text-xs text-slate-500">7.5 pts max</span>
                  </div>
                  <Controller
                    name="marketDemand"
                    control={form.control}
                    render={({ field }) => (
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="space-y-2"
                      >
                        {MARKET_DEMAND_OPTIONS.map((option) => (
                          <div key={option.value} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50">
                            <RadioGroupItem value={option.value} id={`marketDemand-${option.value}`} />
                            <Label htmlFor={`marketDemand-${option.value}`} className="flex-1 cursor-pointer">
                              <span>{option.label}</span>
                              <span className="ml-2 text-xs text-slate-500">({option.points} pts)</span>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  />
                  {form.formState.errors.marketDemand && (
                    <p className="text-sm text-red-500">{form.formState.errors.marketDemand.message}</p>
                  )}
                </div>

                {/* Marketing (7.5 pts) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-slate-900">Marketing Effectiveness</h4>
                    <span className="text-xs text-slate-500">7.5 pts max</span>
                  </div>
                  <Controller
                    name="marketing"
                    control={form.control}
                    render={({ field }) => (
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="space-y-2"
                      >
                        {MARKETING_OPTIONS.map((option) => (
                          <div key={option.value} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50">
                            <RadioGroupItem value={option.value} id={`marketing-${option.value}`} />
                            <Label htmlFor={`marketing-${option.value}`} className="flex-1 cursor-pointer">
                              <span>{option.label}</span>
                              <span className="ml-2 text-xs text-slate-500">({option.points} pts)</span>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  />
                  {form.formState.errors.marketing && (
                    <p className="text-sm text-red-500">{form.formState.errors.marketing.message}</p>
                  )}
                </div>

                {/* Product/Service (10 pts) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-slate-900">Product/Service Strength</h4>
                    <span className="text-xs text-slate-500">10 pts max</span>
                  </div>
                  <Controller
                    name="productStrength"
                    control={form.control}
                    render={({ field }) => (
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="space-y-2"
                      >
                        {PRODUCT_OPTIONS.map((option) => (
                          <div key={option.value} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50">
                            <RadioGroupItem value={option.value} id={`product-${option.value}`} />
                            <Label htmlFor={`product-${option.value}`} className="flex-1 cursor-pointer">
                              <span>{option.label}</span>
                              <span className="ml-2 text-xs text-slate-500">({option.points} pts)</span>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  />
                  {form.formState.errors.productStrength && (
                    <p className="text-sm text-red-500">{form.formState.errors.productStrength.message}</p>
                  )}
                </div>

                {/* Suppliers (5 pts) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-slate-900">Supplier/Purchasing Strength</h4>
                    <span className="text-xs text-slate-500">5 pts max</span>
                  </div>
                  <Controller
                    name="supplierStrength"
                    control={form.control}
                    render={({ field }) => (
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="space-y-2"
                      >
                        {SUPPLIER_OPTIONS.map((option) => (
                          <div key={option.value} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50">
                            <RadioGroupItem value={option.value} id={`supplier-${option.value}`} />
                            <Label htmlFor={`supplier-${option.value}`} className="flex-1 cursor-pointer">
                              <span>{option.label}</span>
                              <span className="ml-2 text-xs text-slate-500">({option.points} pts)</span>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  />
                  {form.formState.errors.supplierStrength && (
                    <p className="text-sm text-red-500">{form.formState.errors.supplierStrength.message}</p>
                  )}
                </div>

                {/* Sales (10 pts) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-slate-900">Sales Execution</h4>
                    <span className="text-xs text-slate-500">10 pts max</span>
                  </div>
                  <Controller
                    name="salesExecution"
                    control={form.control}
                    render={({ field }) => (
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="space-y-2"
                      >
                        {SALES_OPTIONS.map((option) => (
                          <div key={option.value} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50">
                            <RadioGroupItem value={option.value} id={`sales-${option.value}`} />
                            <Label htmlFor={`sales-${option.value}`} className="flex-1 cursor-pointer">
                              <span>{option.label}</span>
                              <span className="ml-2 text-xs text-slate-500">({option.points} pts)</span>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  />
                  {form.formState.errors.salesExecution && (
                    <p className="text-sm text-red-500">{form.formState.errors.salesExecution.message}</p>
                  )}
                </div>
              </div>

              {/* Commentary Section */}
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Business Commentary</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Share insights about your business (all optional)
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-slate-600">
                      Biggest Opportunity (next 90 days)
                    </Label>
                    <Textarea
                      className="mt-1"
                      placeholder="What do you see as the biggest opportunity for growth or improvement?"
                      rows={3}
                      {...form.register('companyBiggestOpportunity')}
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-slate-600">
                      Biggest Risk or Concern
                    </Label>
                    <Textarea
                      className="mt-1"
                      placeholder="What are you most worried about right now?"
                      rows={3}
                      {...form.register('companyBiggestRisk')}
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-slate-600">
                      Current Challenges
                    </Label>
                    <Textarea
                      className="mt-1"
                      placeholder="What challenges are you currently facing?"
                      rows={3}
                      {...form.register('companyChallenges')}
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-slate-600">
                      Recent Wins or Positive Developments
                    </Label>
                    <Textarea
                      className="mt-1"
                      placeholder="What's going well? Any wins to celebrate?"
                      rows={3}
                      {...form.register('companyWins')}
                    />
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
                    'Submit Monthly Data'
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
