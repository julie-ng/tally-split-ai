import { z } from 'zod'

export const newBlobRequestSchema = z.object({
  filename: z.string(),
})
