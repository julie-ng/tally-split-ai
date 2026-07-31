import { and, eq, inArray, desc } from 'drizzle-orm'
import { z } from 'zod'

/**
 * Latest change per expense, for a batch of ids.
 *
 * Feeds the "Updated" column on the expenses table: the client asks for exactly
 * the ids it's rendering and merges the result into its rows. Deliberately NOT
 * folded into /api/expenses — `source` is history's domain, and a list endpoint
 * shouldn't carry another domain's fields (rules/server-api-patterns.md).
 *
 * Returns a MAP keyed by expenseId, not an array: the caller looks up by id.
 * An expense with no history is simply absent — callers treat missing as null.
 *
 * "Latest" means ANY change, pipeline writes included, which is what the column
 * header implies. `source` distinguishes them ('user:<id>' vs 'task:<name>').
 */

// Bounded so one request can't ask for the whole table. The expenses page sends
// a filtered month, which is far below this.
const MAX_IDS = 500

const querySchema = z.object({
  ids: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  // No requireTaskPermission: tasks have no session and thus no householdId, so
  // they cannot reach household-scoped collection endpoints.
  const householdId = event.context.householdId

  const result = await getValidatedQuery(event, query => querySchema.safeParse(query))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid query',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }

  const ids = [...new Set(result.data.ids.split(',').filter(Boolean))]
  if (ids.length === 0) {
    return { success: true, data: {} }
  }
  if (ids.length > MAX_IDS) {
    throw createError({ statusCode: 400, message: `Too many ids (max ${MAX_IDS})` })
  }

  // Scoped by expenses.householdId, NOT by a receipt join — a standalone expense
  // has no receipt and would be dropped by one.
  const rows = await db
    .select({
      expenseId: schema.expenseHistory.expenseId,
      source: schema.changes.source,
      createdAt: schema.changes.createdAt,
    })
    .from(schema.expenseHistory)
    .innerJoin(schema.changes, eq(schema.expenseHistory.changeId, schema.changes.id))
    .innerJoin(schema.expenses, eq(schema.expenseHistory.expenseId, schema.expenses.id))
    .where(and(
      inArray(schema.expenseHistory.expenseId, ids),
      eq(schema.expenses.householdId, householdId),
    ))
    .orderBy(desc(schema.changes.createdAt))

  // One change touches N fields = N rows. Ordered newest-first, so the FIRST row
  // per expense is its latest change and later rows are dropped.
  const data = {}
  for (const row of rows) {
    if (!data[row.expenseId]) {
      data[row.expenseId] = { source: row.source, createdAt: row.createdAt }
    }
  }

  return { success: true, data }
})
