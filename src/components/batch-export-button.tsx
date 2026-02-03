import { Loader2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBatchPdfExport } from '@/hooks/use-batch-pdf-export'
import type { Scorecard } from '@/types/database.types'

interface BatchExportButtonProps {
  scorecards: Scorecard[]
  businessNames: Map<string, string>
  disabled?: boolean
}

export function BatchExportButton({
  scorecards,
  businessNames,
  disabled = false,
}: BatchExportButtonProps) {
  const { exportBatch, isGenerating, progress } = useBatchPdfExport()

  const handleClick = () => {
    if (scorecards.length === 0) return
    exportBatch(scorecards, businessNames)
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={disabled || isGenerating || scorecards.length === 0}
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {progress}%
        </>
      ) : (
        <>
          <Printer className="h-4 w-4 mr-2" />
          Print All ({scorecards.length})
        </>
      )}
    </Button>
  )
}
