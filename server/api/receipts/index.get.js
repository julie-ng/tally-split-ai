import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireUserId(event)
  const userId = event.context.userId

  const receipts = await db.query.receipts.findMany({
    where: eq(schema.receipts.userId, userId),
    with: {
      uploads: true,
    },
  })

  // Aggregate azureTags from uploads for each receipt
  const receiptsWithAggregatedTags = receipts.map((receipt) => {
    // Collect all unique azureTags from uploads
    const allTags = receipt.uploads
      .filter(upload => upload.azureTags)
      .map(upload => upload.azureTags)
      .join(',')

    return {
      ...receipt,
      azureTags: allTags || null,
    }
  })

  return receiptsWithAggregatedTags
})
