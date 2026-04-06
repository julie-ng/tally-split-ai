/**
 * Data Migration Script: Seed receipt splitId from associated splits
 *
 * This script:
 * 1. Finds all receipts without a splitId
 * 2. Looks up the associated split via splits.receiptId
 * 3. Updates the receipt's splitId to establish bidirectional relationship
 *
 * Run with: npx tsx server/db/seed-receipt-split-ids.js
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, isNull } from 'drizzle-orm'
import * as schema from './schema.ts'

// Initialize database connection
const connectionString = process.env.NUXT_DATABASE_URL
  || process.env.DATABASE_URL
  || 'postgresql://receipts:localdev@localhost:5432/ai_receipts'
const pool = new pg.Pool({ connectionString })
const db = drizzle(pool, { schema })

/**
 * Main seeding function
 */
async function seedReceiptSplitIds () {
  console.log('Starting seed: Populate receipt splitId from associated splits\n')
  console.log(`Database: ${connectionString}\n`)

  // Get all receipts without a splitId
  const receiptsWithoutSplitId = await db
    .select()
    .from(schema.receipts)
    .where(isNull(schema.receipts.splitId))

  console.log(`Found ${receiptsWithoutSplitId.length} receipts without splitId\n`)

  if (receiptsWithoutSplitId.length === 0) {
    console.log('No receipts to update.')
    await pool.end()
    return
  }

  let updatedCount = 0
  let skippedCount = 0

  for (const receipt of receiptsWithoutSplitId) {
    // Find the split associated with this receipt
    const [associatedSplit] = await db
      .select()
      .from(schema.splits)
      .where(eq(schema.splits.receiptId, receipt.id))
      .orderBy(schema.splits.createdAt)
      .limit(1)

    if (!associatedSplit) {
      console.log(`Receipt #${receipt.id}: No associated split found`)
      skippedCount++
      continue
    }

    // Update the receipt with the split's id
    await db
      .update(schema.receipts)
      .set({ splitId: associatedSplit.id })
      .where(eq(schema.receipts.id, receipt.id))

    console.log(`Receipt #${receipt.id}: Set splitId to ${associatedSplit.id}`)
    updatedCount++
  }

  console.log('\n--- Seed Summary ---')
  console.log(`Updated: ${updatedCount}`)
  console.log(`Skipped: ${skippedCount}`)
  console.log(`Total processed: ${receiptsWithoutSplitId.length}`)

  await pool.end()
}

// Run the seed
seedReceiptSplitIds().catch((error) => {
  console.error('Seed failed:', error)
  await pool.end()
  process.exit(1)
})
