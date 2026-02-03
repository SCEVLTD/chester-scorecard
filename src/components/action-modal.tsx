import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Extended schema with business_id
const actionWithBusinessSchema = actionSchema.extend({
  business_id: z.string().min(1, 'Business is required'),
})

type ActionWithBusinessFormData = z.infer<typeof actionWithBusinessSchema>

interface ActionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  meetingId?: string
  prefillDescription?: string
  businessId?: string
}

/**
 * Action Modal for creating actions from meetings
 *
 * Features:
 * - Pre-fill description from AI suggestions
 * - Link action to source meeting
 * - Select business if not specified
 */
export function ActionModal({
  open,
  onOpenChange,
  meetingId,
  prefillDescription,
  businessId,
}: ActionModalProps) {
  const createAction = useCreateAction()
  const { data: businesses } = useBusinesses()

  // Default due date to 7 days from now
  const defaultDueDate = new Date()
  defaultDueDate.setDate(defaultDueDate.getDate() + 7)

  const form = useForm<ActionWithBusinessFormData>({
    resolver: zodResolver(actionWithBusinessSchema),
    defaultValues: {
      description: prefillDescription || '',
      owner: '',
      due_date: defaultDueDate.toISOString().split('T')[0],
      business_id: businessId || '',
    },
  })

  // Update description when prefill changes
  useEffect(() => {
    if (prefillDescription) {
      form.setValue('description', prefillDescription)
    }
  }, [prefillDescription, form])

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.reset({
        description: prefillDescription || '',
        owner: '',
        due_date: defaultDueDate.toISOString().split('T')[0],
        business_id: businessId || '',
      })
    }
  }, [open])

  const onSubmit = async (data: ActionWithBusinessFormData) => {
    try {
      await createAction.mutateAsync({
        business_id: data.business_id,
        description: data.description,
        owner: data.owner,
        due_date: data.due_date,
        meeting_id: meetingId,
      })
      toast.success('Action created successfully')
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Action Item</DialogTitle>
          <DialogDescription>
            Create an action item from this meeting suggestion.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Business selector (if not specified) */}
          {!businessId && businesses && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Business</label>
              <Select
                value={form.watch('business_id')}
                onValueChange={(value) => form.setValue('business_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a business" />
                </SelectTrigger>
                <SelectContent>
                  {businesses.map((business) => (
                    <SelectItem key={business.id} value={business.id}>
                      {business.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.business_id && (
                <p className="text-sm text-red-500">
                  Please select a business
                </p>
              )}
            </div>
          )}

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

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createAction.isPending || (!businessId && !form.watch('business_id'))}
            >
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
