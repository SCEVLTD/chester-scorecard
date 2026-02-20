import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useUpdateBusiness, useUpdateBusinessSector } from '@/hooks/use-businesses'
import type { Business } from '@/types/database.types'
import { SectorSelect } from '@/components/sector-select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CompanyEmailsManager } from './company-emails-manager'

interface CompanyEditDialogProps {
  business: Business
  open: boolean
  onOpenChange: (open: boolean) => void
}

const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  contact_name: z.string().nullable().or(z.literal('')),
})

type CompanyFormData = z.infer<typeof companySchema>

export function CompanyEditDialog({
  business,
  open,
  onOpenChange,
}: CompanyEditDialogProps) {
  const updateBusiness = useUpdateBusiness()
  const updateSector = useUpdateBusinessSector()
  const [sectorId, setSectorId] = useState<string | null>(business.sector_id)

  // Reset sector when dialog opens with new business
  useEffect(() => {
    if (open) {
      setSectorId(business.sector_id)
    }
  }, [open, business.sector_id])

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: business.name,
      contact_name: business.contact_name || '',
    },
  })

  const onSubmit = async (data: CompanyFormData) => {
    try {
      // Update business details
      await updateBusiness.mutateAsync({
        businessId: business.id,
        updates: {
          name: data.name,
          contact_name: data.contact_name || null,
        },
      })
      // Update sector if changed
      if (sectorId !== business.sector_id) {
        await updateSector.mutateAsync({
          businessId: business.id,
          sectorId,
        })
      }
      toast.success('Company updated successfully')
      handleClose()
    } catch (error) {
      console.error('Failed to update company:', error)
      toast.error('Failed to update company')
    }
  }

  const handleClose = () => {
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Company</DialogTitle>
          <DialogDescription>
            Update company details for {business.name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name</Label>
            <Input
              id="name"
              placeholder="Company name"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_name">Contact Name</Label>
            <Input
              id="contact_name"
              placeholder="Contact person name"
              {...form.register('contact_name')}
            />
            {form.formState.errors.contact_name && (
              <p className="text-sm text-red-500">
                {form.formState.errors.contact_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Sector</Label>
            <SectorSelect
              value={sectorId}
              onChange={setSectorId}
              placeholder="Select sector"
              allowClear
            />
          </div>

          {/* Email addresses management */}
          <div className="pt-2 border-t">
            <CompanyEmailsManager businessId={business.id} businessName={business.name} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateBusiness.isPending || updateSector.isPending}>
              {updateBusiness.isPending || updateSector.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
