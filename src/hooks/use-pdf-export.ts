/**
 * usePdfExport Hook
 *
 * Provides PDF generation and download functionality with lazy loading.
 * The @react-pdf/renderer library (~1.2MB) is only loaded when the user
 * actually requests a PDF export, preventing bundle bloat.
 */
import { useState, useCallback } from 'react'
import { saveAs } from 'file-saver'
import type { Scorecard } from '@/types/database.types'

interface UsePdfExportReturn {
  /** Generate and download a PDF for the given scorecard */
  exportPdf: (scorecard: Scorecard, businessName: string) => Promise<void>
  /** Whether PDF generation is currently in progress */
  isGenerating: boolean
  /** Error from the last generation attempt, if any */
  error: Error | null
  /** Clear any existing error */
  clearError: () => void
}

/**
 * Hook for exporting scorecards as PDF files
 *
 * Uses dynamic imports to lazy-load the PDF library only when needed.
 * This keeps the initial bundle size small (~1.2MB saved).
 *
 * @example
 * ```tsx
 * function ExportButton({ scorecard, businessName }) {
 *   const { exportPdf, isGenerating, error } = usePdfExport()
 *
 *   return (
 *     <button
 *       onClick={() => exportPdf(scorecard, businessName)}
 *       disabled={isGenerating}
 *     >
 *       {isGenerating ? 'Generating...' : 'Export PDF'}
 *     </button>
 *   )
 * }
 * ```
 */
export function usePdfExport(): UsePdfExportReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const exportPdf = useCallback(async (
    scorecard: Scorecard,
    businessName: string
  ): Promise<void> => {
    setIsGenerating(true)
    setError(null)

    try {
      // Lazy load PDF library and component (~1.2MB)
      // These imports only happen when user clicks export
      const [{ pdf }, { ScorecardPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/scorecard-pdf'),
      ])

      // Generate PDF blob
      // Note: Call ScorecardPdf as a function since we're outside React render
      const blob = await pdf(
        ScorecardPdf({ scorecard, businessName })
      ).toBlob()

      // Generate safe filename: "BusinessName-scorecard-2026-01.pdf"
      const safeName = businessName
        .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .toLowerCase()
      const filename = `${safeName}-scorecard-${scorecard.month}.pdf`

      // Trigger browser download
      saveAs(blob, filename)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('PDF generation failed')
      setError(error)
      console.error('PDF export error:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return {
    exportPdf,
    isGenerating,
    error,
    clearError,
  }
}
