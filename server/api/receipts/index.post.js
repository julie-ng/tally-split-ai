import { z } from 'zod'
import { receiptInputSchema } from '~~/shared/utils/zod-schemas/receipt.schema.js'

export default defineEventHandler(async (event) => {
  const log = useLogger('receipt')
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

  const created = dbResult[0]

  await trackCreate(db, {
    historyTable: schema.receiptHistory,
    entityId: created.id,
    entityIdColumn: 'receiptId',
    source: `user:${userId}`,
  }, created)

  log.info({ receiptId: created.id }, 'Receipt created')

  return {
    success: true,
    created,
  }
})
