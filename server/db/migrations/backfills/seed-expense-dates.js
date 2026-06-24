/**
 * Data Migration Script: Backfill expenses.date from the linked receipt
 *
 * Context: expenses.date (timestamptz) was added as the sort/filter/group key
 * for the whole expenses UI, so an expense owns its own date instead of joining
 * the receipt. Existing expenses came up with date NULL — which makes them sort
 * last AND disappear from month-filtered views. This seeds their date from the
 * linked receipt.
 *
 * The receipt stores a TEXT date ("2025-11-07") + nullable TEXT time
 * ("17:45:00"). We must run those through the SAME Berlin→UTC conversion the
 * create-expense task uses (fromReceiptDateTime) — a raw SQL copy would store
 * the wrong type/timezone. Hence a per-row JS backfill, not a single UPDATE.
 *
 * Targets only expenses that:
 *   - have a linked receipt (receipt_id IS NOT NULL), and
 *   - still have a NULL date (idempotent; never clobbers a set date).
 *
 * Standalone expenses (receipt_id NULL) are left alone — no receipt to copy
 * from. (Any that exist were created via the form with a date already set.)
 *
 * Run AFTER migration 0012 (adds expenses.date).
 *
 * Run with: npx tsx server/db/migrations/backfills/seed-expense-dates.js
 */

import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql } from 'drizzle-orm'
import { safeLogConnectionString } from '#shared/utils/connection-string.utils.js'
import { fromReceiptDateTime } from '#shared/utils/expense-date.utils.js'

const connectionString = process.env.NUXT_DATABASE_URL
if (!connectionString) {
  console.error('NUXT_DATABASE_URL is not set. Aborting.')
  process.exit(1)
}

// Match server/db/connection.ts — postgres-js driver with prepare:false for
// the transaction-mode pooler.
const client = postgres(connectionString, { prepare: false, max: 1 })
const db = drizzle(client)

async function seedExpenseDates () {
  console.log('Starting backfill: copy receipt date+time → expenses.date (Berlin→UTC)\n')
  safeLogConnectionString(connectionString, 'Target')

  // Receipt-linked expenses still missing a date, with the receipt's text
  // date/time alongside.
  const result = await db.execute(sql`
    SELECT e.id AS id, r.date AS "receiptDate", r.time AS "receiptTime"
    FROM expenses e
    JOIN receipts r ON e.receipt_id = r.id
    WHERE e.date IS NULL
  `)

  // postgres-js returns rows as an array directly; normalize defensively in
  // case a driver wraps them in { rows }.
  const rows = Array.isArray(result) ? result : (result.rows ?? [])

  console.log(`Found ${rows.length} receipt-linked expenses with no date\n`)

  let updated = 0
  let skipped = 0

  for (const row of rows) {
    const instant = fromReceiptDateTime(row.receiptDate, row.receiptTime)

    // Receipt had no usable date (null / non-ISO OCR text) — leave the expense
    // null rather than inventing a date.
    if (!instant) {
      console.log(`Expense ${row.id}: receipt date "${row.receiptDate}" unusable, SKIPPED`)
      skipped++
      continue
    }

    await db.execute(sql`
      UPDATE expenses SET date = ${instant}::timestamptz WHERE id = ${row.id}
    `)
    updated++
  }

  console.log('\n--- Backfill Summary ---')
  console.log(`Updated: ${updated}`)
  console.log(`Skipped (no usable receipt date): ${skipped}`)
  console.log(`Total processed: ${rows.length}`)

  await client.end()
}

seedExpenseDates().catch(async (error) => {
  console.error('Backfill failed:', error)
  await client.end()
  process.exit(1)
})
