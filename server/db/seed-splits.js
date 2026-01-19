/**
 * Data Migration Script: Seed splits from receipts with totals
 *
 * This script:
 * 1. Finds all receipts that have a total
 * 2. Creates a split for each receipt (if one doesn't already exist)
 * 3. Sets the splitAmount to the receipt's total
 *
 * Run with: npx tsx server/db/seed-splits.js
 */

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq, isNotNull } from 'drizzle-orm'
import * as schema from './schema.ts'

// Initialize database connection
const databaseUrl = process.env.DATABASE_URL || './.data/db/sqlite.db'
const sqlite = new Database(databaseUrl)
sqlite.pragma('journal_mode = WAL')
const db = drizzle(sqlite, { schema })

/**
 * Main seeding function
 */
async function seedSplits () {
  console.log('Starting seed: Create splits from receipts with totals\n')
  console.log(`Database: ${databaseUrl}\n`)

  // Get all receipts that have a total
  const receiptsWithTotals = await db
    .select()
    .from(schema.receipts)
    .where(isNotNull(schema.receipts.total))

  console.log(`Found ${receiptsWithTotals.length} receipts with totals\n`)

  if (receiptsWithTotals.length === 0) {
    console.log('No receipts with totals found.')
    sqlite.close()
    return
  }

  let createdCount = 0
  let skippedCount = 0

  for (const receipt of receiptsWithTotals) {
    // Check if a split already exists for this receipt
    const [existingSplit] = await db
      .select()
      .from(schema.splits)
      .where(eq(schema.splits.receiptId, receipt.id))
      .limit(1)

    if (existingSplit) {
      console.log(`Receipt #${receipt.id}: Split already exists (split #${existingSplit.id})`)
      skippedCount++
      continue
    }

    // Create a new split for this receipt
    const [newSplit] = await db
      .insert(schema.splits)
      .values({
        receiptId: receipt.id,
        splitAmount: receipt.total,
        paidBy: null, // Not settled yet
        owedAmount: null, // Calculated when paidBy is set
        isSettled: false,
        userId: receipt.userId,
      })
      .returning()

    console.log(`Receipt #${receipt.id}: Created split #${newSplit.id} (amount: ${receipt.total})`)
    createdCount++
  }

  console.log('\n--- Seed Summary ---')
  console.log(`Created: ${createdCount}`)
  console.log(`Skipped: ${skippedCount}`)
  console.log(`Total processed: ${receiptsWithTotals.length}`)

  sqlite.close()
}

// Run the seed
seedSplits().catch((error) => {
  console.error('Seed failed:', error)
  sqlite.close()
  process.exit(1)
})
