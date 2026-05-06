import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireIdParam(event)

  const receiptId = getRouterParam(event, 'id')
  await guards.requireAuthorization(event, { receiptId })

  // Fetch all history rows for this receipt, joined with changes metadata
  const rows = await db
    .select({
      changeId: schema.changes.id,
      source: schema.changes.source,
      sourceVersion: schema.changes.sourceVersion,
      createdAt: schema.changes.createdAt,
      field: schema.receiptHistory.field,
      oldValue: schema.receiptHistory.oldValue,
      newValue: schema.receiptHistory.newValue,
    })
    .from(schema.receiptHistory)
    .innerJoin(schema.changes, eq(schema.receiptHistory.changeId, schema.changes.id))
    .where(eq(schema.receiptHistory.receiptId, receiptId))
    .orderBy(desc(schema.changes.createdAt))

  // Group by changeId
  const changesMap = new Map()
  for (const row of rows) {
    if (!changesMap.has(row.changeId)) {
      changesMap.set(row.changeId, {
        id: row.changeId,
        source: row.source,
        sourceVersion: row.sourceVersion,
        createdAt: row.createdAt,
        fields: [],
      })
    }
    changesMap.get(row.changeId).fields.push({
      field: row.field,
      oldValue: row.oldValue,
      newValue: row.newValue,
    })
  }

  return {
    success: true,
    data: Array.from(changesMap.values()),
  }
})
