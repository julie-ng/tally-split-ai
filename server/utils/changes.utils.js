import { diffFields } from '~~/shared/utils/diff.utils.js'

/**
 * Track field-level changes for a single entity.
 *
 * Must be called inside a db.transaction() — accepts the transaction object (`tx`).
 * Inserts a `changes` row + per-field history rows.
 *
 * @param {object} tx - Drizzle transaction object
 * @param {object} opts
 * @param {object} opts.historyTable - Drizzle table (schema.receiptHistory or schema.splitHistory)
 * @param {number} opts.entityId - The receipt or split ID
 * @param {string} opts.entityIdColumn - Column name for the FK ('receiptId' or 'splitId')
 * @param {string} opts.source - Actor identifier, e.g. 'user:local-dev-user' or 'task:analyze-ocr'
 * @param {string|null} [opts.sourceVersion] - Version string, e.g. 'gpt-4o:2024-11-20'
 * @param {object} before - Row state before update
 * @param {object} after - Row state after update
 * @returns {Promise<number|null>} changeId or null if no fields changed
 */
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

/**
 * Track field-level changes for multiple entities in a single operation.
 * Creates one `changes` row and multiple history rows across entities.
 *
 * @param {object} tx - Drizzle transaction object
 * @param {object} opts
 * @param {object} opts.historyTable - Drizzle table (schema.splitHistory)
 * @param {string} opts.entityIdColumn - Column name for the FK ('splitId')
 * @param {string} opts.source - Actor identifier
 * @param {string|null} [opts.sourceVersion] - Version string
 * @param {Array<{ entityId: number, before: object, after: object }>} entities
 * @returns {Promise<number|null>} changeId or null if no fields changed
 */
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
