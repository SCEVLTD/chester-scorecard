import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useCreateAction } from '@/hooks/use-actions'
import { actionSchema, type ActionFormData } from '@/schemas/action'
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

interface AddActionModalProps {
  businessId: string
  businessName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddActionModal({
  businessId,
  businessName,
  open,
  onOpenChange,
}: AddActionModalProps) {
  const createAction = useCreateAction()

  // Default due date to 7 days from now
  const defaultDueDate = new Date()
  defaultDueDate.setDate(defaultDueDate.getDate() + 7)

  const form = useForm<ActionFormData>({
    resolver: zodResolver(actionSchema),
    defaultValues: {
      description: '',
      owner: '',
      due_date: defaultDueDate.toISOString().split('T')[0],
    },
  })

  const onSubmit = async (data: ActionFormData) => {
    try {
      await createAction.mutateAsync({
        business_id: businessId,
        ...data,
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
          <DialogTitle>Add Action Item</DialogTitle>
          <DialogDescription>
            Create an action item for {businessName} from the Friday meeting.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
