import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { usePdfExport } from '@/hooks/use-pdf-export'
import type { Scorecard, CompanySubmission } from '@/types/database.types'

interface PdfExportButtonProps {
  scorecard: Scorecard
  businessName: string
  submission?: CompanySubmission | null
}

/**
 * PDF Export Button Component
 *
 * Renders a button that triggers PDF generation and download for a scorecard.
 * Shows loading spinner during generation and error message if generation fails.
 */
export function PdfExportButton({ scorecard, businessName, submission }: PdfExportButtonProps) {
  const { exportPdf, isGenerating, error } = usePdfExport()

  return (
    <div className="flex flex-col items-center">
      <Button
        onClick={() => exportPdf(scorecard, businessName, submission)}
        disabled={isGenerating}
        variant="outline"
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating PDF...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-red-500 mt-2">
          Failed to generate PDF. Please try again.
        </p>
      )}
    </div>
  )
}
