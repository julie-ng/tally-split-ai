/**
 * Data Migration Script: Populate analysisStatus by checking for tmp analysis files
 *
 * This script:
 * 1. Fetches all receipts with their linked uploads
 * 2. Checks if a tmp/{hashId}.json analysis file exists for the first upload
 * 3. Sets analysisStatus to 'analyzed' if found, otherwise 'unanalyzed'
 *
 * Run with: npx tsx server/db/seed-receipt-analysis-statuses.js
 */

import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import * as schema from './schema.ts'

const TMP_DIR = './tmp'

// Initialize database connection
const databaseUrl = process.env.DATABASE_URL || './.data/db/sqlite.db'
const sqlite = new Database(databaseUrl)
sqlite.pragma('journal_mode = WAL')
const db = drizzle(sqlite, { schema })

function hasAnalysisFile (hashId) {
  return fs.existsSync(path.join(TMP_DIR, `${hashId}.json`))
}

/**
 * Main seeding function
 */
async function seedReceiptAnalysisStatuses () {
  console.log('Starting seed: Populate analysisStatus from tmp analysis files\n')
  console.log(`Database: ${databaseUrl}`)
  console.log(`Tmp dir:  ${TMP_DIR}\n`)

  // Fetch all receipts with their linked uploads
  const receipts = await db.query.receipts.findMany({
    with: { uploads: true },
  })

  console.log(`Found ${receipts.length} receipts\n`)

  let analyzedCount = 0
  let unanalyzedCount = 0

  for (const receipt of receipts) {
    const hashId = receipt.uploads?.[0]?.hashId
    const analysisStatus = hashId && hasAnalysisFile(hashId) ? 'analyzed' : 'unanalyzed'

    await db
      .update(schema.receipts)
      .set({ analysisStatus })
      .where(eq(schema.receipts.id, receipt.id))

    const fileNote = hashId ? `(hashId: ${hashId})` : '(no upload)'
    console.log(`Receipt #${receipt.id}: ${analysisStatus} ${fileNote}`)

    if (analysisStatus === 'analyzed') {
      analyzedCount++
    }
    else {
      unanalyzedCount++
    }
  }

  console.log('\n--- Seed Summary ---')
  console.log(`Analyzed:   ${analyzedCount}`)
  console.log(`Unanalyzed: ${unanalyzedCount}`)
  console.log(`Total:      ${receipts.length}`)

  sqlite.close()
}

// Run the seed
seedReceiptAnalysisStatuses().catch((error) => {
  console.error('Seed failed:', error)
  sqlite.close()
  process.exit(1)
})
