import { z } from 'zod'
import { eq } from 'drizzle-orm'

/**
 * Update the current household's name and/or description.
 * AuthZ: route param must match the authenticated user's household scope.
 * Any household member can edit (membership is the trust boundary).
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('household')
  const db = useDB()

  await guards.requireAuthentication(event)
  guards.requireUuidParam(event)

  const householdId = getRouterParam(event, 'id')

  // 404 (not 403) — pretend other households don't exist.
  if (householdId !== event.context.householdId) {
    logSecurityEvent(event, 'warn', {
      requestedHouseholdId: householdId,
      sessionHouseholdId: event.context.householdId,
      reason: 'household_scope_mismatch',
    }, 'Household update denied')
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  const result = await readValidatedBody(event, body => zodSchemas.householdUpdateSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }

  const rows = await db
    .update(schema.households)
    .set({ ...result.data, updatedAt: new Date() })
    .where(eq(schema.households.id, householdId))
    .returning()

  if (rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Household not found' })
  }

  log.info({ householdId }, 'Household updated')

  return {
    success: true,
    household: rows[0],
  }
})
