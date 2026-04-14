import { snapshotFields } from '~~/shared/utils/diff.utils.js'

export async function trackDelete (db, { historyTable, entityId, entityIdColumn, source, sourceVersion = null }, deleted) {
  const fields = snapshotFields(deleted, 'delete')
  if (fields.length === 0) return null

  const [change] = await db
    .insert(schema.changes)
    .values({ source, sourceVersion })
    .returning()

  await db.insert(historyTable).values(
    fields.map(f => ({
      changeId: change.id,
      [entityIdColumn]: entityId,
      ...f,
    })),
  )

  const log = useLogger('changes')
  log.info({ changeId: change.id, source, entityId, fields: fields.length }, 'Tracked delete')

  return change.id
}
