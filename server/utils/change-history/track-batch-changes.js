import { diffFields } from '~~/shared/utils/diff.utils.js'

export async function trackBatchChanges (tx, { historyTable, entityIdColumn, source, sourceVersion = null }, entities) {
  const allRows = []
  for (const { entityId, before, after } of entities) {
    const diffs = diffFields(before, after)
    for (const d of diffs) {
      allRows.push({
        [entityIdColumn]: entityId,
        ...d,
      })
    }
  }

  if (allRows.length === 0) return null

  const [change] = await tx
    .insert(schema.changes)
    .values({ source, sourceVersion })
    .returning()

  await tx.insert(historyTable).values(
    allRows.map(row => ({ changeId: change.id, ...row })),
  )

  const log = useLogger('changes')
  log.info({ changeId: change.id, source, entities: entities.length, fields: allRows.length }, 'Tracked batch changes')

  return change.id
}
