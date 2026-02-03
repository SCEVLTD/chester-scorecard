import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useCreateAction } from '@/hooks/use-actions'
import { useBusinesses } from '@/hooks/use-businesses'
import { actionSchema } from '@/schemas/action'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface PortfolioActionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Extend action schema to include business_id
const portfolioActionSchema = actionSchema.extend({
  business_id: z.string().uuid('Please select a business'),
})

type PortfolioActionFormData = z.infer<typeof portfolioActionSchema>

export function PortfolioActionModal({
  open,
  onOpenChange,
}: PortfolioActionModalProps) {
  const createAction = useCreateAction()
  const { data: businesses } = useBusinesses()

  // Default due date to 7 days from now
  const defaultDueDate = new Date()
  defaultDueDate.setDate(defaultDueDate.getDate() + 7)

  const form = useForm<PortfolioActionFormData>({
    resolver: zodResolver(portfolioActionSchema),
    defaultValues: {
      business_id: '',
      description: '',
      owner: '',
      due_date: defaultDueDate.toISOString().split('T')[0],
    },
  })

  const onSubmit = async (data: PortfolioActionFormData) => {
    try {
      const { business_id, ...actionData } = data
      await createAction.mutateAsync({
        business_id,
        ...actionData,
      })

      // Find business name for toast
      const businessName = businesses?.find(b => b.id === business_id)?.name || 'business'
      toast.success(`Action created for ${businessName}`)
      handleClose()
    } catch (error) {
      console.error('Failed to create action:', error)
      toast.error('Failed to create action')
    }
  }

  const handleClose = () => {
    form.reset()
    onOpenChange(false)
  }

  // Sort businesses alphabetically
  const sortedBusinesses = businesses
    ? [...businesses].sort((a, b) => a.name.localeCompare(b.name))
    : []

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Action Item</DialogTitle>
          <DialogDescription>
            Create an action item from the Friday meeting for a specific business.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Business Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Business</label>
            <Select
              value={form.watch('business_id')}
              onValueChange={(value) => form.setValue('business_id', value, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select business..." />
              </SelectTrigger>
              <SelectContent>
                {sortedBusinesses.map((business) => (
                  <SelectItem key={business.id} value={business.id}>
                    {business.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.business_id && (
              <p className="text-sm text-red-500">
                {form.formState.errors.business_id.message}
              </p>
            )}
          </div>

          {/* Action Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Action Description</label>
            <Textarea
              placeholder="e.g., Review Q1 forecast with finance team"
              rows={3}
              {...form.register('description')}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-500">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* Owner */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Owner</label>
            <Input
              placeholder="Person responsible for this action"
              {...form.register('owner')}
            />
            {form.formState.errors.owner && (
              <p className="text-sm text-red-500">
                {form.formState.errors.owner.message}
              </p>
            )}
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Due Date</label>
            <Input
              type="date"
              {...form.register('due_date')}
            />
            {form.formState.errors.due_date && (
              <p className="text-sm text-red-500">
                {form.formState.errors.due_date.message}
              </p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createAction.isPending}>
              {createAction.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Action'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
