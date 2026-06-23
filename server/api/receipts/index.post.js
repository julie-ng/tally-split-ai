import { z } from 'zod'
import { receiptInputSchema } from '#shared/utils/zod-schemas/receipt.schema.js'

export default defineEventHandler(async (event) => {
  const log = useLogger('receipt')
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireTaskPermission(event)

  // For tasks, userId/householdId come from the workflow run's upload
  const userId = event.context.userId
    ?? event.context.workflowRun?.upload?.userId
  const householdId = event.context.householdId
    ?? event.context.workflowRun?.upload?.householdId

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
    householdId,
    ...result.data,
  }

  const dbResult = await db
    .insert(schema.receipts)
    .values(insertData)
    .returning()

  const created = dbResult[0]

  await historyUtils.trackCreate(db, {
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
