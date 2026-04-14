import { snapshotFields } from '#shared/utils/diff.utils.js'

/**
 * Track a newly created entity (all fields null → value).
 * Does NOT require a transaction — creates are single inserts.
 */
export async function trackCreate (db, { historyTable, entityId, entityIdColumn, source, sourceVersion = null }, created) {
  const fields = snapshotFields(created, 'create')
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
  log.info({ changeId: change.id, source, entityId, fields: fields.length }, 'Tracked create')

  return change.id
}
