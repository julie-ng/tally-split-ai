/**
 * Data Migration Script: Rename task IDs in changes.source
 *
 * Context: the HMAC/task-ID rename effort renamed the Trigger.dev tasks
 * `create-split` → `create-expense` and `adjust-split` → `adjust-expense`.
 * The `changes` audit table records the acting principal in `source` as
 * `task:<taskId>` (see server/utils/guards/require-workflow-auth.js).
 *
 * After the rename, NEW rows write `task:create-expense` / `task:adjust-expense`,
 * but every HISTORICAL row still says `task:create-split` / `task:adjust-split`.
 * Per-task attribution (e.g. the v_expense_metrics view groups by source) would
 * be split across the old and new names. This script rewrites the historical
 * rows so history and future are consistent.
 *
 * Idempotent: re-running matches nothing once converted. Safe to run after the
 * code deploy (new rows already use the new IDs).
 *
 * Run with: npx tsx server/db/migrations/backfills/rename-changes-source-task-ids.js
 */

import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql } from 'drizzle-orm'
import { safeLogConnectionString } from '#shared/utils/connection-string.utils.js'

const connectionString = process.env.NUXT_DATABASE_URL
if (!connectionString) {
  console.error('NUXT_DATABASE_URL is not set. Aborting.')
  process.exit(1)
}

// Match server/db/connection.ts — postgres-js driver with prepare:false for
// the transaction-mode pooler.
const client = postgres(connectionString, { prepare: false, max: 1 })
const db = drizzle(client)

const RENAMES = [
  { from: 'task:create-split', to: 'task:create-expense' },
  { from: 'task:adjust-split', to: 'task:adjust-expense' },
]

async function renameChangesSourceTaskIds () {
  console.log('Starting backfill: rename task IDs in changes.source\n')
  safeLogConnectionString(connectionString, 'Target')

  let totalUpdated = 0

  for (const { from, to } of RENAMES) {
    const result = await db.execute(
      sql`UPDATE changes SET source = ${to} WHERE source = ${from}`,
    )
    const count = result.count ?? 0
    console.log(`${from} → ${to}: ${count} row(s) updated`)
    totalUpdated += count
  }

  console.log(`\n--- Backfill Summary ---`)
  console.log(`Total rows updated: ${totalUpdated}`)

  await client.end()
}

renameChangesSourceTaskIds().catch(async (error) => {
  console.error('Backfill failed:', error)
  await client.end()
  process.exit(1)
})
