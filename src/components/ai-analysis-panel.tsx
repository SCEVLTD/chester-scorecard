import { useState, useEffect } from 'react'
import {
  Brain,
  Lightbulb,
  ListChecks,
  AlertTriangle,
  TrendingDown,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useGenerateAnalysis } from '@/hooks/use-ai-analysis'
import type { AIAnalysis } from '@/types/ai-analysis.types'
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
 * AI Analysis Panel Component
 *
 * Displays AI-generated analysis for a scorecard including:
 * - Executive Summary
 * - Questions for Next Call
 * - 30-Day Actions with priority badges
 * - Inconsistencies detected (if any)
 * - Trend breaks vs previous month (if any)
 *
 * Auto-generates analysis on mount if not already present in scorecard.
 * Supports regeneration via button click.
 */
export function AIAnalysisPanel({
  scorecard,
  previousScorecard,
  businessName,
}: AIAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const generateAnalysis = useGenerateAnalysis()

  // On mount, check for existing analysis or trigger generation
  useEffect(() => {
    if (scorecard.ai_analysis) {
      // Analysis already exists in database
      setAnalysis(scorecard.ai_analysis as unknown as AIAnalysis)
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
          <span className="text-sm">Generating AI analysis (5-15 seconds)...</span>
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

  // Success state - render all sections
  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Analysis</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          Generated {new Date(analysis.generatedAt).toLocaleString()}
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
            {analysis.execSummary}
          </p>
        </CardContent>
      </Card>

      {/* Questions for Next Call */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Questions for Next Call
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            {analysis.topQuestions.map((question, index) => (
              <li key={index}>{question}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* 30-Day Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Recommended Actions (Next 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {analysis.actions30Day.map((item, index) => (
              <li key={index} className="flex items-start gap-3">
                <Badge
                  className={priorityColors[item.priority] || 'bg-gray-500'}
                >
                  {item.priority.toUpperCase()}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {item.action}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Inconsistencies (only if present) */}
      {analysis.inconsistencies.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Inconsistencies Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {analysis.inconsistencies.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Trend Breaks (only if present) */}
      {analysis.trendBreaks.length > 0 && (
        <Card className="border-blue-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-blue-600">
              <TrendingDown className="h-4 w-4" />
              Trend Breaks vs Last Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {analysis.trendBreaks.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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
