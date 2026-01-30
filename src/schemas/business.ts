import { z } from 'zod'

export const businessSchema = z.object({
  name: z.string().min(1, 'Business name is required').max(100, 'Name too long'),
})

export type BusinessFormData = z.infer<typeof businessSchema>
