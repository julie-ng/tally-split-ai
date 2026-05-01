/**
 * Data Migration Script: Backfill households for existing users
 *
 * One-time migration to introduce the `households` table. Creates one personal
 * household per existing user, then backfills `householdId` on `users`,
 * `receipts`, and `uploads`.
 *
 * Idempotent: re-running only processes users who do not yet have a household.
 *
 * Run with: npx tsx server/db/seeds/seed-households.js
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, isNull } from 'drizzle-orm'
import * as schema from '../schema.ts'

const connectionString = process.env.NUXT_DATABASE_URL
  || process.env.DATABASE_URL
  || 'postgresql://receipts:localdev@localhost:5432/ai_receipts'
const pool = new pg.Pool({ connectionString })
const db = drizzle(pool, { schema })

async function seedHouseholds () {
  console.log('Starting seed: Backfill households for existing users\n')
  console.log(`Database: ${connectionString}\n`)

  const usersWithoutHousehold = await db
    .select()
    .from(schema.users)
    .where(isNull(schema.users.householdId))

  console.log(`Found ${usersWithoutHousehold.length} users without a household\n`)

  if (usersWithoutHousehold.length === 0) {
    console.log('No users to process.')
    await pool.end()
    return
  }

  let usersUpdated = 0
  let receiptsUpdated = 0
  let uploadsUpdated = 0

  for (const user of usersWithoutHousehold) {
    // Create a personal household for this user
    const [household] = await db
      .insert(schema.households)
      .values({
        name: `${user.username}'s household`,
        description: 'Auto-generated personal household.',
      })
      .returning()

    console.log(`User ${user.username} (${user.id}): created household ${household.id}`)

    await db
      .update(schema.users)
      .set({ householdId: household.id })
      .where(eq(schema.users.id, user.id))
    usersUpdated++

    // receipts.userId and uploads.userId are text columns; users.id is uuid
    const userIdAsText = String(user.id)

    const updatedReceipts = await db
      .update(schema.receipts)
      .set({ householdId: household.id })
      .where(eq(schema.receipts.userId, userIdAsText))
      .returning({ id: schema.receipts.id })
    receiptsUpdated += updatedReceipts.length
    console.log(`  → linked ${updatedReceipts.length} receipts`)

    const updatedUploads = await db
      .update(schema.uploads)
      .set({ householdId: household.id })
      .where(eq(schema.uploads.userId, userIdAsText))
      .returning({ id: schema.uploads.id })
    uploadsUpdated += updatedUploads.length
    console.log(`  → linked ${updatedUploads.length} uploads`)
  }

  // Sanity checks — surface any orphaned rows that didn't get backfilled
  const orphanReceipts = await db
    .select({ id: schema.receipts.id, userId: schema.receipts.userId })
    .from(schema.receipts)
    .where(isNull(schema.receipts.householdId))

  const orphanUploads = await db
    .select({ id: schema.uploads.id, userId: schema.uploads.userId })
    .from(schema.uploads)
    .where(isNull(schema.uploads.householdId))

  console.log('\n--- Seed Summary ---')
  console.log(`Users updated: ${usersUpdated}`)
  console.log(`Receipts updated: ${receiptsUpdated}`)
  console.log(`Uploads updated: ${uploadsUpdated}`)

  if (orphanReceipts.length > 0 || orphanUploads.length > 0) {
    console.warn('\n⚠️  Orphans found (rows whose userId does not match any user):')
    if (orphanReceipts.length > 0) {
      console.warn(`  Receipts: ${orphanReceipts.map(r => `#${r.id} (userId=${r.userId})`).join(', ')}`)
    }
    if (orphanUploads.length > 0) {
      console.warn(`  Uploads: ${orphanUploads.map(u => `#${u.id} (userId=${u.userId})`).join(', ')}`)
    }
    console.warn('Resolve these before adding the notNull constraint.')
  }

  await pool.end()
}

seedHouseholds().catch(async (error) => {
  console.error('Seed failed:', error)
  await pool.end()
  process.exit(1)
})
