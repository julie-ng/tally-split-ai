import { tasks } from '@trigger.dev/sdk/v3'

/**
 * Delete a single expense and everything attached to it.
 *
 * Routes through the same cascade-delete util as the batch endpoint
 * (expensesUtils.deleteMany) so there is ONE definition of "fully delete an
 * expense": delete the receipt (cascading the expense + uploads + history) for
 * receipt-linked expenses, or the expense directly for standalone ones, and
 * offload Azure blob cleanup to the delete-blobs task.
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('expense')
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireIdParam(event)

  const expenseId = getRouterParam(event, 'id')
  await guards.requireAuthorization(event, { expenseId })

  const householdId = event.context.householdId
  const { deletedIds, blobDeleteUrls } = await expensesUtils.deleteMany(db, {
    householdId,
    ids: [expenseId],
  })

  if (deletedIds.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Expense with ID '${expenseId}' not found`,
    })
  }

  // Offload Azure blob cleanup — DB rows are already gone; don't block response.
  if (blobDeleteUrls.length > 0) {
    await tasks.trigger('delete-blobs', { blobDeleteUrls })
  }

  log.info(
    { expenseId, blobs: blobDeleteUrls.length },
    'Expense deleted (receipt + cascade); blob cleanup queued',
  )

  return {
    success: true,
    deleted: { id: expenseId },
  }
})
