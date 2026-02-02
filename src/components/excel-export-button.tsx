import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { useExcelExport } from '@/hooks/use-excel-export'
import type { Scorecard } from '@/types/database.types'

interface ExcelExportButtonProps {
  scorecards: Scorecard[]
  businessName: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

/**
 * Excel Export Button Component
 *
 * Renders a button that triggers Excel generation and download for scorecards.
 * Shows loading spinner during generation and error message if generation fails.
 * Disabled when no scorecards are available.
 */
export function ExcelExportButton({ scorecards, businessName, size }: ExcelExportButtonProps) {
  const { exportExcel, isExporting, error } = useExcelExport()

  const isDisabled = isExporting || scorecards.length === 0

  return (
    <div className="flex flex-col items-center">
      <Button
        onClick={() => exportExcel(scorecards, businessName)}
        disabled={isDisabled}
        variant="outline"
        size={size}
      >
        {isExporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-red-500 mt-2">
          Failed to generate Excel. Please try again.
        </p>
      )}
    </div>
  )
}
