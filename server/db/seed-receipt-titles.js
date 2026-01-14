/**
 * Data Migration Script: Seed receipt titles from associated uploads
 *
 * This script:
 * 1. Finds all receipts without a title (or with default 'Untitled')
 * 2. Gets the first associated upload for each receipt
 * 3. Copies the upload's title to the receipt
 *
 * Run with: npx tsx server/db/seed-receipt-titles.js
 */

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq, or, isNull } from 'drizzle-orm'
import * as schema from './schema.ts'

// Initialize database connection
const databaseUrl = process.env.DATABASE_URL || './.data/db/sqlite.db'
const sqlite = new Database(databaseUrl)
sqlite.pragma('journal_mode = WAL')
const db = drizzle(sqlite, { schema })

/**
 * Main seeding function
 */
async function seedReceiptTitles () {
  console.log('Starting seed: Populate receipt titles from uploads\n')
  console.log(`Database: ${databaseUrl}\n`)

  // Get all receipts that need titles (null or 'Untitled')
  const receiptsNeedingTitles = await db
    .select()
    .from(schema.receipts)
    .where(or(
      isNull(schema.receipts.title),
      eq(schema.receipts.title, 'Untitled'),
    ))

  console.log(`Found ${receiptsNeedingTitles.length} receipts needing titles\n`)

  if (receiptsNeedingTitles.length === 0) {
    console.log('No receipts to update.')
    sqlite.close()
    return
  }

  let updatedCount = 0
  let skippedCount = 0

  for (const receipt of receiptsNeedingTitles) {
    // Find the first upload associated with this receipt
    const [firstUpload] = await db
      .select()
      .from(schema.uploads)
      .where(eq(schema.uploads.receiptId, receipt.id))
      .orderBy(schema.uploads.createdAt)
      .limit(1)

    if (!firstUpload) {
      console.log(`Receipt #${receipt.id}: No associated uploads found`)
      skippedCount++
      continue
    }

    // Skip if upload also has default title
    if (!firstUpload.title || firstUpload.title === 'Untitled') {
      console.log(`Receipt #${receipt.id}: Upload has no meaningful title`)
      skippedCount++
      continue
    }

    // Update the receipt with the upload's title
    await db
      .update(schema.receipts)
      .set({ title: firstUpload.title })
      .where(eq(schema.receipts.id, receipt.id))

    console.log(`Receipt #${receipt.id}: Set title to "${firstUpload.title}"`)
    updatedCount++
  }

  console.log('\n--- Seed Summary ---')
  console.log(`Updated: ${updatedCount}`)
  console.log(`Skipped: ${skippedCount}`)
  console.log(`Total processed: ${receiptsNeedingTitles.length}`)

  sqlite.close()
}

// Run the seed
seedReceiptTitles().catch((error) => {
  console.error('Seed failed:', error)
  sqlite.close()
  process.exit(1)
})
