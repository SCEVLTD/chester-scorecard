import { z } from 'zod'

export const actionSchema = z.object({
  description: z.string().trim().min(1, 'Action description is required'),
  owner: z.string().trim().min(1, 'Owner is required'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid date'),
})

export type ActionFormData = z.infer<typeof actionSchema>
