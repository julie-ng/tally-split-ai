import { z } from 'zod'
import { receiptInputSchema } from '~~/shared/utils/zod-schemas/receipt.schema.js'

export default defineEventHandler(async (event) => {
  const log = useLogger('receipt')
  const db = useDB()
  await requireAuthentication(event)
  requireTaskPermission(event)

  // For tasks, userId comes from the workflow run's upload owner
  const userId = event.context.userId
    ?? event.context.workflowRun?.upload?.userId

  const result = await readValidatedBody(event, body => receiptInputSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }

  // AuthZ: if linking to a split, verify principal owns it
  if (result.data.splitId) {
    await requireAuthorization(event, { splitId: result.data.splitId })
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
    source: event.context.securityPrincipal,
  }, created)

  log.info({ receiptId: created.id }, 'Receipt created')

  return {
    success: true,
    created,
  }
})
