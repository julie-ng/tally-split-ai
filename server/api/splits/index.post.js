import { z } from 'zod'
import { eq, asc } from 'drizzle-orm'
import { splitRequestSchema } from '#shared/utils/zod-schemas/split.schema.js'

export default defineEventHandler(async (event) => {
  const log = useLogger('split')
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireTaskPermission(event)

  const result = await readValidatedBody(event, body => splitRequestSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }

  // AuthZ: if linking to a receipt, verify principal can act on it
  if (result.data.receiptId) {
    await guards.requireAuthorization(event, { receiptId: result.data.receiptId })
  }

  // Resolve the split's household. When linking a receipt, inherit its
  // household (the receipt's AuthZ already passed above). Otherwise this is a
  // standalone split — scope it to the acting principal's household.
  // Stamped once at creation, never changed (a split never moves households).
  let householdId = event.context.householdId ?? null
  if (result.data.receiptId) {
    const [receipt] = await db
      .select({ householdId: schema.receipts.householdId })
      .from(schema.receipts)
      .where(eq(schema.receipts.id, result.data.receiptId))
      .limit(1)
    householdId = receipt?.householdId ?? householdId
  }

  if (!householdId) {
    throw createError({ statusCode: 400, message: 'Cannot resolve household for split' })
  }

  // Auto-assign userOneId/userTwoId slots from the split's household.
  // Slot order is users.createdAt ASC — stable across all splits in a household.
  // Demo households may have only one member; userTwoId stays null in that case.
  let userOneId = result.data.userOneId ?? null
  let userTwoId = result.data.userTwoId ?? null
  if (userOneId === null || userTwoId === null) {
    const members = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.householdId, householdId))
      .orderBy(asc(schema.users.createdAt))
      .limit(2)

    userOneId ??= members[0]?.id ?? null
    userTwoId ??= members[1]?.id ?? null
  }

  const insertData = {
    ...result.data,
    householdId,
    userOneId,
    userTwoId,
    userOneShare: result.data.userOneShare ?? null,
    userTwoShare: result.data.userTwoShare ?? null,
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
