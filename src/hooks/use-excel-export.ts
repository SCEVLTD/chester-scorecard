/**
 * useExcelExport Hook
 *
 * Provides Excel generation and download functionality with lazy loading.
 * The excel-builder-vanilla library (~19KB) is only loaded when the user
 * actually requests an Excel export, preventing bundle bloat.
 */
import { useState, useCallback } from 'react'
import { saveAs } from 'file-saver'
import type { Scorecard } from '@/types/database.types'
import { mapScorecardsToWorksheet } from '@/lib/excel-mapper'

interface UseExcelExportReturn {
  /** Generate and download an Excel file for the given scorecards */
  exportExcel: (scorecards: Scorecard[], businessName: string) => Promise<void>
  /** Whether Excel generation is currently in progress */
  isExporting: boolean
  /** Error from the last generation attempt, if any */
  error: Error | null
  /** Clear any existing error */
  clearError: () => void
}

/**
 * Hook for exporting scorecards as Excel files
 *
 * Uses dynamic imports to lazy-load the Excel library only when needed.
 * This keeps the initial bundle size small (~19KB saved).
 *
 * @example
 * ```tsx
 * function ExportButton({ scorecards, businessName }) {
 *   const { exportExcel, isExporting, error } = useExcelExport()
 *
 *   return (
 *     <button
 *       onClick={() => exportExcel(scorecards, businessName)}
 *       disabled={isExporting}
 *     >
 *       {isExporting ? 'Exporting...' : 'Export Excel'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useExcelExport(): UseExcelExportReturn {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const exportExcel = useCallback(async (
    scorecards: Scorecard[],
    businessName: string
  ): Promise<void> => {
    setIsExporting(true)
    setError(null)

    try {
      // Lazy load Excel library (~19KB)
      const { createWorkbook, createExcelFile } = await import('excel-builder-vanilla')

      // Transform scorecard data
      const worksheetData = mapScorecardsToWorksheet(scorecards, businessName)

      // Create workbook and worksheet
      const workbook = createWorkbook()
      const worksheet = workbook.createWorksheet({ name: worksheetData.name })

      // Set column widths
      worksheet.setColumns(worksheetData.columns)

      // Set data (header + rows)
      worksheet.setData(worksheetData.data)

      // Add worksheet to workbook
      workbook.addWorksheet(worksheet)

      // Generate Excel file as Blob
      const blob = await createExcelFile(workbook, 'Blob')

      // Generate safe filename: "business-name-scorecard-history.xlsx"
      const safeName = businessName
        .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .toLowerCase()
      const filename = `${safeName}-scorecard-history.xlsx`

      // Trigger browser download
      saveAs(blob, filename)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Excel generation failed')
      setError(error)
      console.error('Excel export error:', error)
    } finally {
      setIsExporting(false)
    }
  }, [])

  return {
    exportExcel,
    isExporting,
    error,
    clearError,
  }
}
