import { z } from 'zod'

export const createDataRequestSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Must be YYYY-MM format'),
  createdBy: z.string().trim().min(1, 'Consultant name required'),
})

export type CreateDataRequestData = z.infer<typeof createDataRequestSchema>
