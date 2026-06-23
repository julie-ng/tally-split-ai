/**
 * Data Migration Script: Backfill splits.title from the linked receipt
 *
 * Context: splits.title was added as a NOT NULL column defaulting to 'Untitled'
 * (see docs/SCHEMA.md). Going forward, create-split copies the receipt's title
 * into the new split. This script seeds that title onto pre-existing splits,
 * which all came up as 'Untitled' when the column was added.
 *
 * Targets only splits that:
 *   - have a linked receipt (receiptId IS NOT NULL), and
 *   - still hold the default 'Untitled' (so a deliberately-edited split title
 *     is never clobbered, and re-runs are idempotent).
 *
 * Run AFTER the migration that adds splits.title.
 *
 * Run with: npx tsx server/db/migrations/backfills/seed-split-titles.js
 */

import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { and, eq, isNotNull } from 'drizzle-orm'
import { safeLogConnectionString } from '#shared/utils/connection-string.utils.js'
import * as schema from '../../schema.ts'

const connectionString = process.env.NUXT_DATABASE_URL
if (!connectionString) {
  console.error('NUXT_DATABASE_URL is not set. Aborting.')
  process.exit(1)
}

// Match server/db/connection.ts — postgres-js driver with prepare:false for
// the transaction-mode pooler.
const client = postgres(connectionString, { prepare: false, max: 1 })
const db = drizzle(client, { schema })

async function seedSplitTitles () {
  console.log('Starting seed: Backfill splits.title from linked receipt\n')
  safeLogConnectionString(connectionString, 'Target')

  // Splits with a receipt that still hold the default title.
  const candidates = await db
    .select({ id: schema.splits.id, receiptId: schema.splits.receiptId })
    .from(schema.splits)
    .where(and(
      isNotNull(schema.splits.receiptId),
      eq(schema.splits.title, 'Untitled'),
    ))

  console.log(`Found ${candidates.length} splits with a receipt and default title\n`)

  if (candidates.length === 0) {
    console.log('No splits to update.')
    await client.end()
    return
  }

  let updatedCount = 0
  let skippedCount = 0

  for (const split of candidates) {
    const [receipt] = await db
      .select({ title: schema.receipts.title })
      .from(schema.receipts)
      .where(eq(schema.receipts.id, split.receiptId))
      .limit(1)

    // If the receipt has no usable title, leave the split at 'Untitled'.
    if (!receipt?.title || receipt.title === 'Untitled') {
      console.log(`Split ${split.id}: receipt ${split.receiptId} has no custom title, SKIPPED`)
      skippedCount++
      continue
    }

    await db
      .update(schema.splits)
      .set({ title: receipt.title })
      .where(eq(schema.splits.id, split.id))

    console.log(`Split ${split.id}: set title to "${receipt.title}"`)
    updatedCount++
  }

  console.log('\n--- Seed Summary ---')
  console.log(`Updated: ${updatedCount}`)
  console.log(`Skipped (no custom receipt title): ${skippedCount}`)
  console.log(`Total processed: ${candidates.length}`)

  await client.end()
}

seedSplitTitles().catch(async (error) => {
  console.error('Seed failed:', error)
  await client.end()
  process.exit(1)
})
