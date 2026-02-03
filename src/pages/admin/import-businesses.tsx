import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import { useLocation } from 'wouter'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

import { ExcelImportDropzone } from '@/components/admin/excel-import-dropzone'
import { parseBusinessSpreadsheet, type BusinessImportRow } from '@/lib/business-import-parser'
import { useBusinesses } from '@/hooks/use-businesses'
import { supabase } from '@/lib/supabase'

type ImportState = 'idle' | 'parsing' | 'preview' | 'importing' | 'complete'

interface ParsedBusiness extends BusinessImportRow {
  status: 'new' | 'duplicate'
  duplicateId?: string
}

interface ImportResult {
  created: number
  skipped: number
  errors: string[]
}

export function ImportBusinessesPage() {
  const [, navigate] = useLocation()
  const [state, setState] = useState<ImportState>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsedBusinesses, setParsedBusinesses] = useState<ParsedBusiness[]>([])
  const [detectedColumns, setDetectedColumns] = useState<string[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const { data: existingBusinesses } = useBusinesses()

  const handleFileSelected = useCallback(async (file: File) => {
    setSelectedFile(file)
    setState('parsing')
    setImportResult(null)

    try {
      // Parse the spreadsheet
      const { rows, detectedColumns: cols, errors } = await parseBusinessSpreadsheet(file)

      if (rows.length === 0 && errors.length > 0) {
        toast.error('Failed to parse file')
        setParseErrors(errors)
        setState('idle')
        return
      }

      // Check for duplicates against existing businesses
      const businessesWithStatus: ParsedBusiness[] = rows.map((row) => {
        const normalizedName = row.companyName.toLowerCase().trim()
        const duplicate = existingBusinesses?.find(
          (b) => b.name.toLowerCase().trim() === normalizedName
        )

        return {
          ...row,
          status: duplicate ? 'duplicate' : 'new',
          duplicateId: duplicate?.id,
        }
      })

      setParsedBusinesses(businessesWithStatus)
      setDetectedColumns(cols)
      setParseErrors(errors)
      setState('preview')

      const newCount = businessesWithStatus.filter((b) => b.status === 'new').length
      const dupCount = businessesWithStatus.filter((b) => b.status === 'duplicate').length

      if (newCount === 0) {
        toast.warning(`All ${dupCount} businesses already exist`)
      } else {
        toast.success(`Found ${newCount} new businesses (${dupCount} duplicates will be skipped)`)
      }
    } catch (err) {
      console.error('Parse error:', err)
      toast.error('Failed to parse file: ' + (err instanceof Error ? err.message : 'Unknown error'))
      setState('idle')
    }
  }, [existingBusinesses])

  const handleImport = useCallback(async () => {
    const newBusinesses = parsedBusinesses.filter((b) => b.status === 'new')

    if (newBusinesses.length === 0) {
      toast.warning('No new businesses to import')
      return
    }

    setState('importing')
    const result: ImportResult = {
      created: 0,
      skipped: parsedBusinesses.filter((b) => b.status === 'duplicate').length,
      errors: [],
    }

    try {
      // Import each business
      for (const business of newBusinesses) {
        try {
          // Create business
          const { data: createdBusiness, error: businessError } = await supabase
            .from('businesses')
            .insert({
              name: business.companyName,
              contact_email: business.contactEmail,
              contact_name: business.contactName,
            })
            .select('id')
            .single()

          if (businessError) throw businessError

          // If there's a contact email, create company_emails entry
          if (business.contactEmail && createdBusiness) {
            const { error: emailError } = await supabase
              .from('company_emails')
              .insert({
                business_id: (createdBusiness as { id: string }).id,
                email: business.contactEmail,
                is_primary: true,
              })

            if (emailError) {
              console.error(`Failed to create email for ${business.companyName}:`, emailError)
              result.errors.push(
                `${business.companyName}: Business created but email failed - ${emailError.message}`
              )
            }
          }

          result.created++
        } catch (err) {
          console.error(`Failed to import ${business.companyName}:`, err)
          result.errors.push(
            `${business.companyName}: ${err instanceof Error ? err.message : 'Unknown error'}`
          )
        }
      }

      setImportResult(result)
      setState('complete')

      if (result.errors.length === 0) {
        toast.success(
          `Successfully imported ${result.created} businesses${
            result.skipped > 0 ? ` (${result.skipped} skipped as duplicates)` : ''
          }`
        )
      } else {
        toast.warning(
          `Imported ${result.created} businesses with ${result.errors.length} errors`
        )
      }
    } catch (err) {
      console.error('Import error:', err)
      toast.error('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
      setState('preview')
    }
  }, [parsedBusinesses])

  const handleReset = () => {
    setSelectedFile(null)
    setParsedBusinesses([])
    setDetectedColumns([])
    setParseErrors([])
    setImportResult(null)
    setState('idle')
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/portfolio')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Import Businesses</h1>
          <p className="text-muted-foreground">
            Upload a spreadsheet to bulk import businesses into the system
          </p>
        </div>
      </div>

      {/* Upload area */}
      {state === 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Spreadsheet</CardTitle>
            <CardDescription>
              Upload an Excel or CSV file with columns: Company/Business Name, Email, Contact Name
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExcelImportDropzone
              onFileSelected={handleFileSelected}
              isLoading={false}
              selectedFile={selectedFile}
            />
          </CardContent>
        </Card>
      )}

      {/* Parsing state */}
      {state === 'parsing' && (
        <Card>
          <CardContent className="py-12 text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground animate-pulse" />
            <p className="mt-4 text-lg font-medium">Parsing spreadsheet...</p>
          </CardContent>
        </Card>
      )}

      {/* Preview state */}
      {(state === 'preview' || state === 'importing') && (
        <>
          {/* Detected columns */}
          <Card>
            <CardHeader>
              <CardTitle>Detected Columns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {detectedColumns.map((col, i) => (
                  <div key={i} className="text-sm text-muted-foreground">
                    {col}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Parse errors */}
          {parseErrors.length > 0 && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Parse Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {parseErrors.map((err, i) => (
                    <li key={i} className="text-sm text-destructive">
                      {err}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Preview table */}
          <Card>
            <CardHeader>
              <CardTitle>Preview ({parsedBusinesses.length} businesses)</CardTitle>
              <CardDescription>
                {parsedBusinesses.filter((b) => b.status === 'new').length} new businesses will be
                imported. Duplicates will be skipped.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Contact Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedBusinesses.map((business, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          {business.status === 'new' ? (
                            <Badge variant="default">New</Badge>
                          ) : (
                            <Badge variant="secondary">Duplicate</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{business.companyName}</TableCell>
                        <TableCell>{business.contactEmail || '—'}</TableCell>
                        <TableCell>{business.contactName || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={handleImport} disabled={state === 'importing'}>
                  {state === 'importing' ? 'Importing...' : `Import ${parsedBusinesses.filter((b) => b.status === 'new').length} Businesses`}
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Complete state */}
      {state === 'complete' && importResult && (
        <>
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                Import Complete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>
                  <strong>{importResult.created}</strong> businesses created
                </p>
                {importResult.skipped > 0 && (
                  <p>
                    <strong>{importResult.skipped}</strong> duplicates skipped
                  </p>
                )}
                {importResult.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {importResult.errors.length} errors:
                    </p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {importResult.errors.map((err, i) => (
                        <li key={i} className="text-destructive">
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => navigate('/portfolio')}>Back to Portfolio</Button>
                <Button variant="outline" onClick={handleReset}>
                  Import Another File
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
