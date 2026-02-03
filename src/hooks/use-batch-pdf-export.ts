/**
 * useBatchPdfExport Hook
 *
 * Generates multiple PDFs concurrently and bundles them into a ZIP file.
 * Uses Promise.all for parallel generation (browser handles ~6-10 concurrent).
 */
import { useState, useCallback } from 'react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { Scorecard } from '@/types/database.types'

interface UseBatchPdfExportReturn {
  exportBatch: (scorecards: Scorecard[], businessNames: Map<string, string>) => Promise<void>
  isGenerating: boolean
  progress: number // 0-100
  error: Error | null
  clearError: () => void
}

export function useBatchPdfExport(): UseBatchPdfExportReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const exportBatch = useCallback(async (
    scorecards: Scorecard[],
    businessNames: Map<string, string>
  ): Promise<void> => {
    setIsGenerating(true)
    setProgress(0)
    setError(null)

    try {
      // Lazy load PDF library (~1.2MB)
      const [{ pdf }, { ScorecardPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/scorecard-pdf'),
      ])

      const total = scorecards.length
      let completed = 0

      // Generate all PDFs concurrently
      const pdfBlobs = await Promise.all(
        scorecards.map(async (scorecard) => {
          const businessName = businessNames.get(scorecard.business_id) ?? 'Unknown'

          const blob = await pdf(
            ScorecardPdf({ scorecard, businessName })
          ).toBlob()

          completed++
          setProgress(Math.round((completed / total) * 100))

          // Safe filename
          const safeName = businessName
            .replace(/[^a-zA-Z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase()

          return {
            blob,
            filename: `${safeName}-scorecard-${scorecard.month}.pdf`
          }
        })
      )

      // Bundle into ZIP
      const zip = new JSZip()
      pdfBlobs.forEach(({ blob, filename }) => {
        zip.file(filename, blob)
      })

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      })

      const date = new Date().toISOString().split('T')[0]
      saveAs(zipBlob, `chester-scorecards-${date}.zip`)

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Batch PDF generation failed')
      setError(error)
      console.error('Batch PDF export error:', error)
    } finally {
      setIsGenerating(false)
      setProgress(0)
    }
  }, [])

  return {
    exportBatch,
    isGenerating,
    progress,
    error,
    clearError,
  }
}
