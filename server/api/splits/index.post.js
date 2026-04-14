import { z } from 'zod'
import { splitRequestSchema } from '~~/shared/utils/zod-schemas/split.schema.js'

export default defineEventHandler(async (event) => {
  const log = useLogger('split')
  const db = useDB()
  await requireAuthentication(event)
  requireTaskPermission(event)

  // For tasks, userId comes from the workflow run's upload owner
  const userId = event.context.userId
    ?? event.context.workflowRun?.upload?.userId

  const result = await readValidatedBody(event, body => splitRequestSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }

  // AuthZ: if linking to a receipt, verify principal owns it
  if (result.data.receiptId) {
    await requireAuthorization(event, { receiptId: result.data.receiptId })
  }

  // Calculate both user shares (equal split for now)
  const halfAmount = Math.floor(result.data.splitAmount / 2 * 100) / 100
  const userAShare = result.data.paidBy ? halfAmount : null
  const userBShare = result.data.paidBy ? halfAmount : null

  const insertData = {
    userId,
    ...result.data,
    userAShare,
    userBShare,
    isSettled: result.data.isSettled ?? false,
  }

  const dbResult = await db
    .insert(schema.splits)
    .values(insertData)
    .returning()

  const created = dbResult[0]

  await historyUtils.trackCreate(db, {
    historyTable: schema.splitHistory,
    entityId: created.id,
    entityIdColumn: 'splitId',
    source: event.context.securityPrincipal,
  }, created)

  log.info({ splitId: created.id }, 'Split created')

  return {
    success: true,
    created,
  }
})
