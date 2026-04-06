import { z } from 'zod'
import { receiptInputSchema } from '~~/shared/utils/zod-schemas/receipt.schema.js'

export default defineEventHandler(async (event) => {
  const db = useDB()
  requireUserId(event)
  const userId = event.context.userId

  const result = await readValidatedBody(event, body => receiptInputSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }

  const insertData = {
    userId,
    ...result.data,
  }

  const dbResult = await db
    .insert(schema.receipts)
    .values(insertData)
    .returning()

  return {
    success: true,
    created: dbResult[0],
  }
})
