/**
 * Data Migration Script: Backfill workflow_runs.householdId
 *
 * Context: workflow_runs.householdId was added as a denormalized, write-once
 * AuthZ scope column (see docs/SCHEMA.md), so realtime subscriptions and RLS
 * policies can scope a run to a household by a DIRECT column rather than a
 * 2-hop join (workflow_runs → uploads → users/household_members).
 *
 * This app is single-household in both dev and prod, so every existing
 * workflow_run belongs to the one and only household. Rather than derive the
 * household per-row via the upload chain, we resolve THE household and stamp it
 * onto every row whose householdId is null. The script asserts exactly one
 * household exists and aborts otherwise — if that assumption ever changes, this
 * backfill must be rewritten to derive per-row (see seed-split-household-ids.js
 * for the join-based pattern).
 *
 * Run AFTER the column has been added (nullable) and BEFORE the NOT NULL
 * constraint is applied. See the run sequence in docs/SCHEMA.md / JOURNAL.md.
 *
 * Run with: npx tsx server/db/migrations/backfills/seed-workflow-run-household-ids.js
 */

import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { isNull } from 'drizzle-orm'
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

async function seedWorkflowRunHouseholdIds () {
  console.log('Starting seed: Backfill workflow_runs.householdId (single-household app)\n')
  safeLogConnectionString(connectionString, 'Target')

  // Single-household assumption: resolve THE household, refuse to guess if there
  // is more than one (a multi-household future must derive per-row instead).
  const households = await db
    .select({ id: schema.households.id })
    .from(schema.households)

  if (households.length === 0) {
    console.error('No household found — nothing to backfill against. Aborting.')
    await client.end()
    process.exit(1)
  }

  if (households.length > 1) {
    console.error(`Found ${households.length} households. This backfill assumes exactly one.`)
    console.error('Rewrite to derive householdId per-row via the upload chain before running. Aborting.')
    await client.end()
    process.exit(1)
  }

  const householdId = households[0].id
  console.log(`Resolved single household: ${householdId}\n`)

  const runsWithoutHousehold = await db
    .select({ id: schema.workflowRuns.id })
    .from(schema.workflowRuns)
    .where(isNull(schema.workflowRuns.householdId))

  console.log(`Found ${runsWithoutHousehold.length} workflow_runs without householdId\n`)

  if (runsWithoutHousehold.length === 0) {
    console.log('No workflow_runs to update.')
    await client.end()
    return
  }

  const updated = await db
    .update(schema.workflowRuns)
    .set({ householdId })
    .where(isNull(schema.workflowRuns.householdId))
    .returning({ id: schema.workflowRuns.id })

  console.log('\n--- Seed Summary ---')
  console.log(`Updated: ${updated.length}`)
  console.log(`All set to household: ${householdId}`)

  await client.end()
}

seedWorkflowRunHouseholdIds().catch(async (error) => {
  console.error('Seed failed:', error)
  await client.end()
  process.exit(1)
})
