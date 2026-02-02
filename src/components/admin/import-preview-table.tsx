import type { ParseResult } from '@/schemas/import-row'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle } from 'lucide-react'

interface Props {
  parseResult: ParseResult
}

export function ImportPreviewTable({ parseResult }: Props) {
  const { validRows, invalidRows, unmatchedBusinesses, detectedColumns } = parseResult

  return (
    <div className="space-y-4">
      {/* Column detection summary */}
      <div className="text-sm">
        <span className="font-medium">Detected columns: </span>
        {detectedColumns.join(', ') || 'None'}
      </div>

      {/* Unmatched businesses warning */}
      {unmatchedBusinesses.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <div className="flex items-center gap-2 text-destructive font-medium">
            <AlertCircle className="h-4 w-4" />
            {unmatchedBusinesses.length} unmatched business name(s)
          </div>
          <ul className="mt-2 text-sm space-y-1">
            {unmatchedBusinesses.map((name) => (
              <li key={name}>- {name}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary stats */}
      <div className="flex gap-4 text-sm">
        <Badge variant="outline" className="bg-green-50">
          <CheckCircle className="h-3 w-3 mr-1" />
          {validRows.length} valid
        </Badge>
        <Badge variant="outline" className="bg-red-50">
          <AlertCircle className="h-3 w-3 mr-1" />
          {invalidRows.length} invalid
        </Badge>
      </div>

      {/* Preview table - scrollable */}
      <div className="border rounded-lg overflow-auto max-h-96">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-0">
            <tr>
              <th className="p-2 text-left">Row</th>
              <th className="p-2 text-left">Business</th>
              <th className="p-2 text-left">Month</th>
              <th className="p-2 text-right">Revenue</th>
              <th className="p-2 text-right">GP</th>
              <th className="p-2 text-right">EBITDA</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {validRows.map((row, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">{i + 2}</td>
                <td className="p-2">{row.businessName}</td>
                <td className="p-2">{row.month}</td>
                <td className="p-2 text-right">{row.revenue?.toLocaleString() ?? '-'}</td>
                <td className="p-2 text-right">{row.grossProfit?.toLocaleString() ?? '-'}</td>
                <td className="p-2 text-right">{row.ebitda?.toLocaleString() ?? '-'}</td>
                <td className="p-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700">Valid</Badge>
                </td>
              </tr>
            ))}
            {invalidRows.map((row, i) => (
              <tr key={`invalid-${i}`} className="border-t bg-red-50/50">
                <td className="p-2">{row.rowNumber}</td>
                <td className="p-2 text-red-700" colSpan={5}>
                  {row.errors.join(', ')}
                </td>
                <td className="p-2">
                  <Badge variant="outline" className="bg-red-50 text-red-700">Invalid</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
