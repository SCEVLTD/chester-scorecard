import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useCreateDataRequest } from '@/hooks/use-data-requests'
import { createDataRequestSchema, type CreateDataRequestData } from '@/schemas/data-request'
import { buildMagicLink } from '@/lib/magic-link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, Copy, Loader2 } from 'lucide-react'

interface RequestDataModalProps {
  businessId: string
  businessName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

export function RequestDataModal({
  businessId,
  businessName,
  open,
  onOpenChange,
}: RequestDataModalProps) {
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const createRequest = useCreateDataRequest()

  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0')

  const form = useForm<CreateDataRequestData>({
    resolver: zodResolver(createDataRequestSchema),
    defaultValues: {
      month: `${currentYear}-${currentMonth}`,
      createdBy: '',
    },
  })

  const [selectedYear, setSelectedYear] = useState(String(currentYear))
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month)
    form.setValue('month', `${selectedYear}-${month}`)
  }

  const handleYearChange = (year: string) => {
    setSelectedYear(year)
    form.setValue('month', `${year}-${selectedMonth}`)
  }

  const onSubmit = async (data: CreateDataRequestData) => {
    try {
      const request = await createRequest.mutateAsync({
        businessId,
        month: data.month,
        createdBy: data.createdBy,
      })
      const link = buildMagicLink(request.token)
      setGeneratedLink(link)
      toast.success('Link generated successfully!')
    } catch (error) {
      console.error('Failed to create data request:', error)
      toast.error('Failed to create data request. This business/month may already have a pending request.')
    }
  }

  const handleCopy = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setGeneratedLink(null)
    setCopied(false)
    form.reset()
    onOpenChange(false)
  }

  // Generate year options (current year and previous year)
  const years = [String(currentYear), String(currentYear - 1)]

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Financial Data</DialogTitle>
          <DialogDescription>
            Create a secure link to send to {businessName} for financial data submission.
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <div className="grid grid-cols-2 gap-2">
                <Select value={selectedMonth} onValueChange={handleMonthChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={handleYearChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.formState.errors.month && (
                <p className="text-sm text-red-500">{form.formState.errors.month.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Your Name (Consultant)</label>
              <Input
                placeholder="Enter your name"
                {...form.register('createdBy')}
              />
              {form.formState.errors.createdBy && (
                <p className="text-sm text-red-500">{form.formState.errors.createdBy.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRequest.isPending}>
                {createRequest.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Generate Link'
                )}
              </Button>
            </div>

            {createRequest.isError && (
              <p className="text-sm text-red-500">
                Failed to create request. This business/month may already have a pending request.
              </p>
            )}
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium">Link generated successfully!</p>
              <p className="text-xs text-green-600 mt-1">Valid for 7 days</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Share this link with {businessName}</label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={generatedLink}
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
