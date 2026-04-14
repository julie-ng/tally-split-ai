import { diffFields } from '~~/shared/utils/diff.utils.js'

export async function trackChanges (tx, { historyTable, entityId, entityIdColumn, source, sourceVersion = null }, before, after) {
  const diffs = diffFields(before, after)
  if (diffs.length === 0) return null

  const [change] = await tx
    .insert(schema.changes)
    .values({ source, sourceVersion })
    .returning()

  await tx.insert(historyTable).values(
    diffs.map(d => ({
      changeId: change.id,
      [entityIdColumn]: entityId,
      ...d,
    })),
  )

  const log = useLogger('changes')
  log.info({ changeId: change.id, source, entityId, fields: diffs.length }, 'Tracked changes')

  return change.id
}
