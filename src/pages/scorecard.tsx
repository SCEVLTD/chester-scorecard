import { useMemo, useEffect, useState } from 'react'
import { useParams, useLocation, useSearch } from 'wouter'
import { useForm, Controller, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, subMonths, startOfMonth } from 'date-fns'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { useBusinesses } from '@/hooks/use-businesses'
import { useCreateScorecard, useScorecard, useUpdateScorecard, useBusinessScorecards } from '@/hooks/use-scorecards'
import { useSubmissionForBusinessMonth } from '@/hooks/use-company-submissions'
import { mapScorecardToForm } from '@/lib/scorecard-mapper'
import { submissionToVariances } from '@/lib/variance-calculator'
import { scorecardSchema, type ScorecardData } from '@/schemas/scorecard'
import { calculateTotalScore, getRagStatus } from '@/lib/scoring'
import { ScoreHeader } from '@/components/score-header'
import { FinancialSection } from '@/components/financial-section'
import { SubmittedFinancialsDisplay } from '@/components/submitted-financials-display'
import { CompanyInsightsDisplay } from '@/components/company-insights-display'
import { PeopleSection } from '@/components/people-section'
import { MarketSection } from '@/components/market-section'
import { ProductSection } from '@/components/product-section'
import { SuppliersSection } from '@/components/suppliers-section'
import { SalesSection } from '@/components/sales-section'
import { CommentarySection } from '@/components/commentary-section'
import { ConfirmationScreen } from '@/components/confirmation-screen'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Scorecard } from '@/types/database.types'

export function ScorecardPage() {
  const params = useParams<{ businessId: string; scorecardId?: string }>()
  const [, navigate] = useLocation()
  const searchString = useSearch()
  const isEditMode = !!params.scorecardId

  // Get month from URL params (when coming from "Create Scorecard" on submitted request)
  const urlMonth = new URLSearchParams(searchString).get('month')

  const { data: businesses } = useBusinesses()
  const { data: existingScorecard, isLoading: isLoadingScorecard } = useScorecard(params.scorecardId)
  const { data: scorecards } = useBusinessScorecards(params.businessId!)

  const createScorecard = useCreateScorecard()
  const updateScorecard = useUpdateScorecard()

  // Track selected month for submission lookup
  const [selectedMonth, setSelectedMonth] = useState<string>(urlMonth || '')

  // Query for company submission for this business+month
  const { data: companySubmission } = useSubmissionForBusinessMonth(
    params.businessId,
    selectedMonth || undefined
  )

  // Track submitted data for confirmation screen
  const [submittedData, setSubmittedData] = useState<Scorecard | null>(null)

  const business = businesses?.find((b) => b.id === params.businessId)

  // Calculate previous month's score for trend comparison
  const previousScorecard = useMemo(() => {
    if (!scorecards || scorecards.length < 1) return null
    // If editing, find the scorecard after this one (which is the previous month)
    if (isEditMode && existingScorecard) {
      const currentIndex = scorecards.findIndex(s => s.id === params.scorecardId)
      return currentIndex >= 0 && currentIndex < scorecards.length - 1
        ? scorecards[currentIndex + 1]
        : null
    }
    // If creating new, previous is the first (most recent) scorecard
    return scorecards[0] || null
  }, [scorecards, isEditMode, existingScorecard, params.scorecardId])

  // Generate last 12 months for selection, plus existing scorecard's month if editing
  const months = useMemo(() => {
    const monthList = Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(startOfMonth(new Date()), i)
      return {
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy'),
      }
    })

    // If editing and the scorecard's month isn't in the list, add it
    if (existingScorecard?.month && !monthList.some(m => m.value === existingScorecard.month)) {
      const [year, monthNum] = existingScorecard.month.split('-')
      const date = new Date(parseInt(year), parseInt(monthNum) - 1)
      monthList.push({
        value: existingScorecard.month,
        label: format(date, 'MMMM yyyy'),
      })
    }

    return monthList
  }, [existingScorecard?.month])

  // Default values for new scorecard
  const defaultFormValues = {
    // Setup (Phase 1)
    month: urlMonth || '',
    consultantName: '',
    // Financial (Phase 2)
    revenueVariance: undefined,
    grossProfitVariance: undefined,
    overheadsVariance: undefined,
    netProfitVariance: undefined,
    // People/HR (Phase 3)
    productivityBenchmark: undefined,
    productivityActual: undefined,
    leadership: undefined,
    // Market & Demand (Phase 3)
    marketDemand: undefined,
    marketing: undefined,
    // Product (Phase 3)
    productStrength: undefined,
    // Suppliers (Phase 3)
    supplierStrength: undefined,
    // Sales (Phase 3)
    salesExecution: undefined,
    // Commentary (Phase 4)
    biggestOpportunity: '',
    biggestRisk: '',
    managementAvoiding: '',
    leadershipConfidence: undefined,
    consultantGutFeel: '',
  }

  const form = useForm<ScorecardData>({
    resolver: zodResolver(scorecardSchema),
    defaultValues: defaultFormValues,
    // Use values prop to sync with existing scorecard - this keeps form in sync with external data
    values: existingScorecard ? mapScorecardToForm(existingScorecard) : undefined,
  })

  // Sync selectedMonth when existing scorecard loads
  useEffect(() => {
    if (existingScorecard) {
      setSelectedMonth(existingScorecard.month)
    }
  }, [existingScorecard])

  // Set form values from company submission when it loads
  useEffect(() => {
    if (companySubmission && !isEditMode) {
      const variances = submissionToVariances(companySubmission)
      // Update financial variances and productivity from submission
      // Convert null to undefined for form compatibility
      form.setValue('revenueVariance', variances.revenueVariance ?? undefined)
      form.setValue('grossProfitVariance', variances.grossProfitVariance ?? undefined)
      form.setValue('overheadsVariance', variances.overheadsVariance ?? undefined)
      form.setValue('netProfitVariance', variances.netProfitVariance ?? undefined)
      form.setValue('productivityBenchmark', variances.productivityBenchmark ?? undefined)
      form.setValue('productivityActual', variances.productivityActual ?? undefined)
    }
  }, [companySubmission, isEditMode, form])

  // Watch all form values for total score calculation
  const watchedValues = form.watch()
  const totalScore = calculateTotalScore(watchedValues)

  const onSubmit = async (data: ScorecardData) => {
    const scorecardPayload = {
      business_id: params.businessId!,
      month: data.month,
      consultant_name: data.consultantName,
      // Financial (convert undefined to null)
      revenue_variance: data.revenueVariance ?? null,
      gross_profit_variance: data.grossProfitVariance ?? null,
      overheads_variance: data.overheadsVariance ?? null,
      net_profit_variance: data.netProfitVariance ?? null,
      // People/HR
      productivity_benchmark: data.productivityBenchmark ?? null,
      productivity_actual: data.productivityActual ?? null,
      leadership: data.leadership ?? null,
      // Market
      market_demand: data.marketDemand ?? null,
      marketing: data.marketing ?? null,
      // Product
      product_strength: data.productStrength ?? null,
      // Suppliers
      supplier_strength: data.supplierStrength ?? null,
      // Sales
      sales_execution: data.salesExecution ?? null,
      // Commentary (mandatory - never null)
      biggest_opportunity: data.biggestOpportunity,
      biggest_risk: data.biggestRisk,
      management_avoiding: data.managementAvoiding,
      leadership_confidence: data.leadershipConfidence!,
      consultant_gut_feel: data.consultantGutFeel,
      // Computed
      total_score: totalScore,
      rag_status: getRagStatus(totalScore),
      // Link to company submission if exists
      company_submission_id: companySubmission?.id ?? null,
    }

    try {
      let result: Scorecard
      if (isEditMode) {
        result = await updateScorecard.mutateAsync({
          id: params.scorecardId!,
          ...scorecardPayload,
        })
      } else {
        result = await createScorecard.mutateAsync(scorecardPayload)
      }
      setSubmittedData(result)
    } catch (error) {
      console.error('Failed to save scorecard:', error)
      toast.error('Failed to save scorecard. Please try again.')
    }
  }

  // Determine pending state from either mutation
  const isPending = createScorecard.isPending || updateScorecard.isPending
  const mutationError = createScorecard.error || updateScorecard.error

  // Show loading state in edit mode while fetching scorecard
  if (isEditMode && isLoadingScorecard) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-muted-foreground">Loading scorecard...</p>
        </div>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <p className="text-muted-foreground">Loading business...</p>
      </div>
    )
  }

  // Show confirmation screen on successful submission
  if (submittedData) {
    return (
      <ConfirmationScreen
        scorecard={submittedData}
        previousScorecard={previousScorecard}
        businessName={business.name}
        onNewScorecard={() => {
          setSubmittedData(null)
          createScorecard.reset()
          updateScorecard.reset()
          form.reset()
        }}
        onBackToBusinesses={() => navigate(`/business/${params.businessId}`)}
      />
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <PageHeader
        backTo={`/business/${params.businessId}`}
        backText="Back"
        showTagline={false}
      />

      <h1 className="text-2xl md:text-3xl font-bold mb-2">{business.name}</h1>
      <p className="text-muted-foreground mb-6">
        {isEditMode ? 'Edit Scorecard' : 'New Monthly Scorecard'}
      </p>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Score Header - total + RAG at top */}
          <ScoreHeader totalScore={totalScore} />

          {/* Setup Card - month and consultant */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Scorecard Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="month">Month Being Scored</Label>
                <Controller
                  name="month"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      key={field.value || 'empty'}
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value)
                        setSelectedMonth(value)
                      }}
                      disabled={isEditMode}
                    >
                      <SelectTrigger
                        id="month"
                        className={`w-full ${isEditMode ? 'bg-muted' : ''}`}
                      >
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
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.month.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="consultantName">Consultant Name</Label>
                <Input
                  id="consultantName"
                  {...form.register('consultantName')}
                  placeholder="Enter your name"
                  aria-invalid={!!form.formState.errors.consultantName}
                />
                {form.formState.errors.consultantName && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.consultantName.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Financial Performance Section (40 pts) */}
          {companySubmission ? (
            <>
              <SubmittedFinancialsDisplay submission={companySubmission} />
              <CompanyInsightsDisplay submission={companySubmission} />
            </>
          ) : (
            <FinancialSection />
          )}

          {/* People/HR Section (20 pts) */}
          <PeopleSection />

          {/* Market & Demand Section (15 pts) */}
          <MarketSection />

          {/* Product/Service Section (10 pts) */}
          <ProductSection />

          {/* Suppliers/Purchasing Section (5 pts) */}
          <SuppliersSection />

          {/* Sales Section (10 pts) */}
          <SalesSection />

          {/* Commentary Section (Phase 4) */}
          <CommentarySection />

          {/* Previous month reference */}
          {previousScorecard && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Previous month ({previousScorecard.month}): Score {previousScorecard.total_score} ({previousScorecard.rag_status})
              </p>
            </div>
          )}

          {/* Error display */}
          {mutationError && (
            <p className="text-red-500 text-sm">
              Error: {mutationError.message || 'Failed to save scorecard'}
            </p>
          )}

          {/* Submit button with loading state */}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full md:w-auto"
          >
            {isPending ? 'Saving...' : isEditMode ? 'Update Scorecard' : 'Submit Scorecard'}
          </Button>
        </form>
      </FormProvider>
    </div>
  )
}
