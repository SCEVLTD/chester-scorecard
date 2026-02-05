import { useState, useEffect } from 'react'
import {
  Brain,
  Lightbulb,
  ListChecks,
  AlertTriangle,
  TrendingDown,
  RefreshCw,
  MessageCircle,
  Target,
  Flag,
  UserCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useGenerateAnalysis } from '@/hooks/use-ai-analysis'
import { useAuth } from '@/contexts/auth-context'
import { isStorageFormat, type AIAnalysisStorage, type StandardAnalysis, type ConsultantAnalysis, type LegacyAnalysis } from '@/schemas/ai-analysis'
import type { Scorecard } from '@/types/database.types'

interface AIAnalysisPanelProps {
  scorecard: Scorecard
  previousScorecard: Scorecard | null
  businessName: string
}

/**
 * Priority badge color mapping
 */
const priorityColors: Record<string, string> = {
  high: 'bg-red-500 text-white',
  medium: 'bg-amber-500 text-white',
  low: 'bg-green-500 text-white',
}

/**
 * Loading skeleton for AI analysis generation
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-muted rounded w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-5/6" />
            <div className="h-3 bg-muted rounded w-4/6" />
          </div>
        </CardContent>
      </Card>
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-muted rounded w-1/4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-muted rounded w-2/5" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-5/6" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Standard Analysis Display (for company and super_admin)
 */
function StandardAnalysisDisplay({ analysis, generatedAt }: { analysis: StandardAnalysis; generatedAt: string }) {
  // Defensive checks - ensure arrays exist and are actually arrays
  const topQuestions = Array.isArray(analysis?.topQuestions) ? analysis.topQuestions : []
  const actions30Day = Array.isArray(analysis?.actions30Day) ? analysis.actions30Day : []
  const inconsistencies = Array.isArray(analysis?.inconsistencies) ? analysis.inconsistencies : []
  const trendBreaks = Array.isArray(analysis?.trendBreaks) ? analysis.trendBreaks : []

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Analysis</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          Generated {new Date(generatedAt).toLocaleString()}
        </span>
      </div>

      {/* Executive Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {analysis.execSummary || 'No summary available.'}
          </p>
        </CardContent>
      </Card>

      {/* Focus Points for Next Month */}
      {topQuestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Focus Points for Next Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              {topQuestions.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* 30-Day Actions */}
      {actions30Day.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Recommended Actions (Next 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {actions30Day.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Badge className={priorityColors[item?.priority] || 'bg-gray-500'}>
                    {(item?.priority || 'medium').toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {item?.action || 'No action specified'}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Inconsistencies (only if present) */}
      {inconsistencies.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Inconsistencies Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {inconsistencies.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Trend Breaks (only if present) */}
      {trendBreaks.length > 0 && (
        <Card className="border-blue-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-blue-600">
              <TrendingDown className="h-4 w-4" />
              Trend Breaks vs Last Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {trendBreaks.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/**
 * Consultant Analysis Display (strategic, no specific figures)
 */
function ConsultantAnalysisDisplay({ analysis, generatedAt }: { analysis: ConsultantAnalysis; generatedAt: string }) {
  // Defensive checks for required arrays
  const keyObservations = Array.isArray(analysis.keyObservations) ? analysis.keyObservations : []
  const discussionPoints = Array.isArray(analysis.discussionPoints) ? analysis.discussionPoints : []
  const strategicRecommendations = Array.isArray(analysis.strategicRecommendations) ? analysis.strategicRecommendations : []
  const redFlags = Array.isArray(analysis.redFlags) ? analysis.redFlags : []

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Consultant Briefing</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          Generated {new Date(generatedAt).toLocaleString()}
        </span>
      </div>

      {/* Executive Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Strategic Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {analysis.execSummary || 'No summary available.'}
          </p>
        </CardContent>
      </Card>

      {/* Key Observations */}
      {keyObservations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Key Observations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              {keyObservations.map((observation, index) => (
                <li key={index}>{observation}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Discussion Points for Meeting */}
      {discussionPoints.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Discussion Points for Meeting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              {discussionPoints.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Strategic Recommendations */}
      {strategicRecommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Strategic Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {strategicRecommendations.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Badge className={priorityColors[item?.priority] || 'bg-gray-500'}>
                    {(item?.priority || 'medium').toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {item?.recommendation || 'No recommendation'}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Red Flags (only if present) */}
      {redFlags.length > 0 && (
        <Card className="border-red-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-600">
              <Flag className="h-4 w-4" />
              Areas of Concern
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {redFlags.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Relationship Context */}
      {analysis.relationshipContext && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-blue-700">
              <UserCheck className="h-4 w-4" />
              Client Perspective
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {analysis.relationshipContext}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/**
 * AI Analysis Panel Component
 *
 * Displays AI-generated analysis for a scorecard.
 * - Consultants see strategic briefing without specific figures
 * - Company users and super_admins see detailed analysis with figures
 *
 * Auto-generates BOTH versions on mount if not already present.
 * Legacy analyses (single version) are regenerated to create both versions.
 */
export function AIAnalysisPanel({
  scorecard,
  previousScorecard,
  businessName,
}: AIAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<AIAnalysisStorage | null>(null)
  const generateAnalysis = useGenerateAnalysis()
  const { userRole } = useAuth()

  // Check if current user is a consultant
  const isConsultant = userRole === 'consultant'

  // On mount, check for existing analysis or trigger generation
  useEffect(() => {
    if (scorecard.ai_analysis) {
      const existingAnalysis = scorecard.ai_analysis as unknown

      // Check if it's the new storage format (has standard/consultant keys)
      if (isStorageFormat(existingAnalysis as AIAnalysisStorage | LegacyAnalysis)) {
        const storageAnalysis = existingAnalysis as AIAnalysisStorage

        // Check if we have the version we need
        const hasRequiredVersion = isConsultant
          ? !!storageAnalysis.consultant
          : !!storageAnalysis.standard

        if (hasRequiredVersion) {
          setAnalysis(storageAnalysis)
          return
        }
      }

      // Legacy format or missing required version - regenerate with both versions
      if (!generateAnalysis.isPending && !generateAnalysis.isSuccess) {
        console.log('[AIAnalysisPanel] Regenerating to create both versions...')
        generateAnalysis.mutate({
          scorecardId: scorecard.id,
          scorecard,
          previousScorecard,
          businessName,
        })
      }
    } else if (!generateAnalysis.isPending && !generateAnalysis.isSuccess) {
      // No analysis yet, trigger generation
      generateAnalysis.mutate({
        scorecardId: scorecard.id,
        scorecard,
        previousScorecard,
        businessName,
      })
    }
  }, [scorecard.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update local state when mutation succeeds
  useEffect(() => {
    if (generateAnalysis.isSuccess && generateAnalysis.data) {
      setAnalysis(generateAnalysis.data)
    }
  }, [generateAnalysis.isSuccess, generateAnalysis.data])

  // Handle regeneration
  const handleRegenerate = () => {
    setAnalysis(null)
    generateAnalysis.reset()
    generateAnalysis.mutate({
      scorecardId: scorecard.id,
      scorecard,
      previousScorecard,
      businessName,
    })
  }

  // Loading state
  if (generateAnalysis.isPending) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Brain className="h-5 w-5 animate-pulse" />
          <span className="text-sm">Generating AI analysis (10-20 seconds)...</span>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  // Error state
  if (generateAnalysis.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between">
          <span>Failed to generate AI analysis. Please try again.</span>
          <Button variant="outline" size="sm" onClick={handleRegenerate}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // No analysis yet and not loading (shouldn't happen, but guard)
  if (!analysis) {
    return null
  }

  // Determine which version to display
  const displayContent = isConsultant && analysis.consultant ? (
    <ConsultantAnalysisDisplay
      analysis={analysis.consultant}
      generatedAt={analysis.generatedAt}
    />
  ) : analysis.standard ? (
    <StandardAnalysisDisplay
      analysis={analysis.standard}
      generatedAt={analysis.generatedAt}
    />
  ) : null

  if (!displayContent) {
    return (
      <Alert>
        <AlertDescription className="flex items-center justify-between">
          <span>Analysis not available for your role. Regenerating...</span>
          <Button variant="outline" size="sm" onClick={handleRegenerate}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {displayContent}

      {/* Regenerate button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerate}
          disabled={generateAnalysis.isPending}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Regenerate Analysis
        </Button>
      </div>
    </div>
  )
}
