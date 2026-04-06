/**
 * One-time data migration: SQLite → PostgreSQL
 *
 * Reads all data from the SQLite database (via sqlite3 CLI)
 * and inserts it into the PostgreSQL database.
 *
 * Usage: npx tsx server/db/migrate-sqlite-to-postgres.js
 */

import { execSync } from 'node:child_process'
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import * as schema from './schema.ts'

const SQLITE_PATH = '.data/db/sqlite.db'

const connectionString = process.env.NUXT_DATABASE_URL
  || process.env.DATABASE_URL
  || 'postgresql://receipts:localdev@localhost:5432/ai_receipts'

function readSqliteTable (table) {
  const raw = execSync(`sqlite3 -json "${SQLITE_PATH}" "SELECT * FROM ${table}"`, {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  })
  return JSON.parse(raw)
}

function unixToDate (epoch) {
  if (epoch == null) return null
  return new Date(epoch * 1000)
}

async function migrate () {
  console.log(`📦 Reading from SQLite: ${SQLITE_PATH}`)
  console.log(`🐘 Writing to Postgres: ${connectionString}\n`)

  const pool = new pg.Pool({ connectionString })
  const db = drizzle(pool, { schema })

  // Read all data from SQLite
  const sqliteReceipts = readSqliteTable('receipts')
  const sqliteUploads = readSqliteTable('uploads')
  const sqliteSplits = readSqliteTable('splits')

  console.log(`Found: ${sqliteReceipts.length} receipts, ${sqliteUploads.length} uploads, ${sqliteSplits.length} splits\n`)

  // Clear existing data (safe for re-runs)
  console.log('--- Clearing existing Postgres data ---')
  await db.execute(sql`TRUNCATE uploads, receipts, splits CASCADE`)
  console.log('  ✓ tables truncated\n')

  // Insert order matters due to circular FKs (receipts ↔ splits):
  // 1. Splits without receiptId (to avoid FK violation)
  // 2. Receipts with splitId (splits exist now)
  // 3. Update splits with their receiptId (receipts exist now)

  console.log('--- Migrating splits (without receiptId) ---')
  for (const row of sqliteSplits) {
    await db.insert(schema.splits).values({
      id: row.id,
      receiptId: null, // deferred — set after receipts exist
      splitAmount: row.split_amount,
      paidBy: row.paid_by,
      userAShare: row.user_a_share,
      userBShare: row.user_b_share,
      isSettled: row.is_settled === 1,
      settledAt: unixToDate(row.settled_at),
      notes: row.notes,
      userId: row.user_id,
      createdAt: unixToDate(row.created_at),
      updatedAt: unixToDate(row.updated_at),
    })
    console.log(`  ✓ split #${row.id}`)
  }

  console.log('\n--- Migrating receipts ---')
  for (const row of sqliteReceipts) {
    await db.insert(schema.receipts).values({
      id: row.id,
      title: row.title,
      merchantName: row.merchant_name,
      merchantAddress: row.merchant_address,
      merchantPhone: row.merchant_phone,
      tags: row.tags,
      date: row.date,
      subtotal: row.subtotal,
      tax: row.tax,
      tip: row.tip,
      total: row.total,
      currency: row.currency,
      notes: row.notes,
      splitId: row.split_id,
      analysisStatus: row.analysis_status || 'unanalyzed',
      userId: row.user_id,
      createdAt: unixToDate(row.created_at),
      updatedAt: unixToDate(row.updated_at),
    })
    console.log(`  ✓ receipt #${row.id} — ${row.merchant_name || row.title}`)
  }

  // Now link splits back to their receipts
  console.log('\n--- Linking splits → receipts ---')
  for (const row of sqliteSplits) {
    if (row.receipt_id) {
      await db.update(schema.splits)
        .set({ receiptId: row.receipt_id })
        .where(sql`id = ${row.id}`)
      console.log(`  ✓ split #${row.id} → receipt #${row.receipt_id}`)
    }
  }

  // Migrate uploads
  console.log('\n--- Migrating uploads ---')
  for (const row of sqliteUploads) {
    // Parse azureTags from JSON string to object for jsonb column
    let azureTags = null
    if (row.azure_tags) {
      try {
        azureTags = JSON.parse(row.azure_tags)
      }
      catch {
        azureTags = row.azure_tags
      }
    }

    await db.insert(schema.uploads).values({
      id: row.id,
      hashId: row.hash_id,
      userId: row.user_id,
      title: row.title,
      receiptId: row.receipt_id,
      status: row.status,
      blobName: row.blob_name,
      blobUrl: row.blob_url,
      thumbnailName: row.thumbnail_name,
      thumbnailUrl: row.thumbnail_url,
      originalFilename: row.original_filename,
      contentType: row.content_type,
      size: row.size,
      azureTags,
      analysisStatus: row.analysis_status,
      analyzedAt: unixToDate(row.analyzed_at),
      analysisOcrResult: row.analysis_ocr_result,
      createdAt: unixToDate(row.created_at),
      updatedAt: unixToDate(row.updated_at),
      uploadedAt: unixToDate(row.uploaded_at),
    })
    console.log(`  ✓ upload #${row.id} — ${row.hash_id}`)
  }

  // Reset serial sequences to max id + 1 so new inserts get correct IDs
  console.log('\n--- Resetting sequences ---')
  await db.execute(sql`SELECT setval('receipts_id_seq', (SELECT COALESCE(MAX(id), 0) FROM receipts))`)
  await db.execute(sql`SELECT setval('uploads_id_seq', (SELECT COALESCE(MAX(id), 0) FROM uploads))`)
  await db.execute(sql`SELECT setval('splits_id_seq', (SELECT COALESCE(MAX(id), 0) FROM splits))`)
  console.log('  ✓ sequences reset')

  console.log('\n✅ Migration complete!')
  await pool.end()
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
