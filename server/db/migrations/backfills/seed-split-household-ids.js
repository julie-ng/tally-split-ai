/**
 * Data Migration Script: Backfill splits.householdId from the linked receipt
 *
 * Context: splits.householdId was added as a denormalized, write-once AuthZ
 * scope column (see docs/SCHEMA.md). Every existing split has a receiptId
 * (splits were historically created only as the final pipeline step after a
 * receipt existed), so we can derive each split's household via its receipt.
 *
 * This script:
 * 1. Finds all splits whose householdId is null
 * 2. Looks up the household via splits.receiptId → receipts.householdId
 * 3. Sets splits.householdId
 *
 * Run AFTER the column has been added (nullable) and BEFORE the NOT NULL
 * constraint is applied. See the run sequence in docs/SCHEMA.md / JOURNAL.md.
 *
 * Run with: npx tsx server/db/migrations/backfills/seed-split-household-ids.js
 */

import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq, isNull } from 'drizzle-orm'
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

async function seedSplitHouseholdIds () {
  console.log('Starting seed: Backfill splits.householdId from linked receipt\n')
  safeLogConnectionString(connectionString, 'Target')

  const splitsWithoutHousehold = await db
    .select()
    .from(schema.splits)
    .where(isNull(schema.splits.householdId))

  console.log(`Found ${splitsWithoutHousehold.length} splits without householdId\n`)

  if (splitsWithoutHousehold.length === 0) {
    console.log('No splits to update.')
    await client.end()
    return
  }

  let updatedCount = 0
  let skippedCount = 0

  for (const split of splitsWithoutHousehold) {
    if (!split.receiptId) {
      console.log(`Split ${split.id}: no receiptId — cannot derive household, SKIPPED`)
      skippedCount++
      continue
    }

    const [receipt] = await db
      .select({ householdId: schema.receipts.householdId })
      .from(schema.receipts)
      .where(eq(schema.receipts.id, split.receiptId))
      .limit(1)

    if (!receipt?.householdId) {
      console.log(`Split ${split.id}: receipt ${split.receiptId} has no householdId, SKIPPED`)
      skippedCount++
      continue
    }

    await db
      .update(schema.splits)
      .set({ householdId: receipt.householdId })
      .where(eq(schema.splits.id, split.id))

    console.log(`Split ${split.id}: set householdId to ${receipt.householdId}`)
    updatedCount++
  }

  console.log('\n--- Seed Summary ---')
  console.log(`Updated: ${updatedCount}`)
  console.log(`Skipped: ${skippedCount}`)
  console.log(`Total processed: ${splitsWithoutHousehold.length}`)

  if (skippedCount > 0) {
    console.log('\n⚠️  Some splits were skipped — they will block the NOT NULL constraint.')
    console.log('   Inspect them in Drizzle Studio before applying the NOT NULL migration.')
  }

  await client.end()
}

seedSplitHouseholdIds().catch(async (error) => {
  console.error('Seed failed:', error)
  await client.end()
  process.exit(1)
})
