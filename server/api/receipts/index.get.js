import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  const userId = event.context.userId

  const receipts = await db.query.receipts.findMany({
    where: eq(schema.receipts.userId, userId),
    with: {
      uploads: true,
    },
  })

  // Aggregate azureTags from uploads for each receipt
  const receiptsWithAggregatedTags = receipts.map((receipt) => {
    // Merge all azureTags from uploads into a single object, filtering out internal tags
    const allTags = receipt.uploads
      .filter(upload => upload.azureTags)
      .map(upload => azureUtils.excludeInternalBlobTags(upload.azureTags))
      .reduce((acc, tags) => ({ ...acc, ...tags }), {})

    return {
      ...receipt,
      azureTags: Object.keys(allTags).length > 0 ? allTags : null,
    }
  })

  return receiptsWithAggregatedTags
})
