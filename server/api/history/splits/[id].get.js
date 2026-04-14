import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireIdParam(event)

  const splitId = parseInt(getRouterParam(event, 'id'), 10)

  // Fetch all history rows for this split, joined with changes metadata
  const rows = await db
    .select({
      changeId: schema.changes.id,
      source: schema.changes.source,
      sourceVersion: schema.changes.sourceVersion,
      createdAt: schema.changes.createdAt,
      field: schema.splitHistory.field,
      oldValue: schema.splitHistory.oldValue,
      newValue: schema.splitHistory.newValue,
    })
    .from(schema.splitHistory)
    .innerJoin(schema.changes, eq(schema.splitHistory.changeId, schema.changes.id))
    .where(eq(schema.splitHistory.splitId, splitId))
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
