import { db, schema } from 'hub:db'
import { z } from 'zod'
import { splitInputSchema } from '~~/shared/utils/zod-schemas/split.schema.js'

export default defineEventHandler(async (event) => {
  requireUserId(event)
  const userId = event.context.userId

  const result = await readValidatedBody(event, body => splitInputSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
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

  return {
    success: true,
    created: dbResult[0],
  }
})
