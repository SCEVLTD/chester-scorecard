import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  onFileSelected: (file: File) => void
  isLoading?: boolean
  selectedFile?: File | null
}

export function ExcelImportDropzone({ onFileSelected, isLoading, selectedFile }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    disabled: isLoading,
    onDrop: ([file]) => file && onFileSelected(file),
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
        isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
        isLoading && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input {...getInputProps()} />
      {selectedFile ? (
        <>
          <FileSpreadsheet className="mx-auto h-12 w-12 text-green-600" />
          <p className="mt-2 font-medium">{selectedFile.name}</p>
          <p className="text-sm text-muted-foreground">Click or drop to replace</p>
        </>
      ) : (
        <>
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 font-medium">Drag & drop Excel or CSV file</p>
          <p className="text-sm text-muted-foreground">Or click to browse</p>
        </>
      )}
    </div>
  )
}
