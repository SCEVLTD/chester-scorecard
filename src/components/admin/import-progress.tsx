import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface Props {
  total: number
  completed: number
  failed: number
  isComplete: boolean
  errors: string[]
}

export function ImportProgress({ total, completed, failed, isComplete, errors }: Props) {
  const progress = total > 0 ? ((completed + failed) / total) * 100 : 0

  return (
    <div className="space-y-4">
      {!isComplete && (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Importing... {completed + failed} of {total}</span>
        </div>
      )}

      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {isComplete && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>{completed} rows imported successfully</span>
          </div>
          {failed > 0 && (
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-4 w-4" />
              <span>{failed} rows failed</span>
            </div>
          )}
          {errors.length > 0 && (
            <ul className="text-sm text-red-600 mt-2 space-y-1">
              {errors.slice(0, 10).map((err, i) => (
                <li key={i}>- {err}</li>
              ))}
              {errors.length > 10 && <li>...and {errors.length - 10} more</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
