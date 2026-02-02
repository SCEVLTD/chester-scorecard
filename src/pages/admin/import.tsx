import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload, Download } from 'lucide-react'
import { useLocation } from 'wouter'

import { ExcelImportDropzone } from '@/components/admin/excel-import-dropzone'
import { ImportPreviewTable } from '@/components/admin/import-preview-table'
import { ImportProgress } from '@/components/admin/import-progress'

import { parseExcelFile, mapColumnsToFields, validateImportRows } from '@/lib/excel-import-parser'
import { downloadImportTemplate } from '@/lib/excel-template-generator'
import { useExcelImport } from '@/hooks/use-excel-import'
import { useBusinesses } from '@/hooks/use-businesses'
import type { ParseResult } from '@/schemas/import-row'

type ImportState = 'idle' | 'parsing' | 'preview' | 'importing' | 'complete'

export function AdminImportPage() {
  const [, navigate] = useLocation()
  const [state, setState] = useState<ImportState>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [progress, setProgress] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    isComplete: false,
    errors: [] as string[],
  })

  const { data: businesses } = useBusinesses()
  const importMutation = useExcelImport()

  const handleFileSelected = useCallback(async (file: File) => {
    setSelectedFile(file)
    setState('parsing')

    try {
      // Parse Excel file
      const { rawRows, headers } = await parseExcelFile(file)

      if (rawRows.length === 0) {
        toast.error('File is empty or has no data rows')
        setState('idle')
        return
      }

      // Map columns to schema fields
      const { mappedRows, detectedColumns } = mapColumnsToFields(rawRows, headers)

      // Validate and match business names
      const result = validateImportRows(
        mappedRows,
        businesses?.map(b => ({ id: b.id, name: b.name })) ?? [],
        detectedColumns
      )

      setParseResult(result)
      setState('preview')

      if (result.validRows.length === 0) {
        toast.warning('No valid rows found. Check the preview for errors.')
      } else {
        toast.success(`Parsed ${result.validRows.length} valid rows`)
      }
    } catch (err) {
      console.error('Parse error:', err)
      toast.error('Failed to parse file: ' + (err instanceof Error ? err.message : 'Unknown error'))
      setState('idle')
    }
  }, [businesses])

  const handleImport = useCallback(async () => {
    if (!parseResult || parseResult.validRows.length === 0) return

    setState('importing')
    setProgress({
      total: parseResult.validRows.length,
      completed: 0,
      failed: 0,
      isComplete: false,
      errors: [],
    })

    try {
      const result = await importMutation.mutateAsync({
        rows: parseResult.validRows,
        onProgress: setProgress,
      })

      setState('complete')

      if (result.failureCount === 0) {
        toast.success(`Successfully imported ${result.successCount} rows`)
      } else {
        toast.warning(`Imported ${result.successCount} rows, ${result.failureCount} failed`)
      }
    } catch (err) {
      console.error('Import error:', err)
      toast.error('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
      setState('preview')
    }
  }, [parseResult, importMutation])

  const handleReset = () => {
    setSelectedFile(null)
    setParseResult(null)
    setProgress({ total: 0, completed: 0, failed: 0, isComplete: false, errors: [] })
    setState('idle')
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Import Historical Data</CardTitle>
            <CardDescription>
              Upload Excel or CSV files containing historical sales, EBITDA, or target data.
              The system will match business names and import the data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Download template button */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Need a template?</span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={downloadImportTemplate}
              >
                <Download className="mr-1 h-3 w-3" />
                Download Excel Template
              </Button>
            </div>

            {/* File dropzone - always visible for reference */}
            <ExcelImportDropzone
              onFileSelected={handleFileSelected}
              isLoading={state === 'parsing' || state === 'importing'}
              selectedFile={selectedFile}
            />

            {/* Preview */}
            {state === 'preview' && parseResult && (
              <>
                <ImportPreviewTable parseResult={parseResult} />

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={handleReset}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={parseResult.validRows.length === 0}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Import {parseResult.validRows.length} Rows
                  </Button>
                </div>
              </>
            )}

            {/* Progress during import */}
            {(state === 'importing' || state === 'complete') && (
              <ImportProgress {...progress} />
            )}

            {/* Complete - offer reset */}
            {state === 'complete' && (
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleReset}>
                  Import Another File
                </Button>
                <Button onClick={() => navigate('/')}>
                  Back to Dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
