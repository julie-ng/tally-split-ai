/**
 * Seed: First household (with two users)
 *
 * Bootstraps a fresh database with the first household and its two authorized
 * users (closed user set — OAuth login only refreshes existing users, so the
 * initial members have to be inserted out-of-band).
 *
 * Creates ONE shared household, then adds both GitHub users to it (slot order =
 * insertion order; user 1 is inserted first so it becomes userOne). This
 * reflects the app model where a household is shared between two people who
 * split expenses — unlike the old per-user personal-household seed.
 *
 * Reads from the runtime environment (injected per-environment, e.g. via a
 * password manager):
 *   - NUXT_DATABASE_URL          — required, Postgres connection string
 *   - TALLY_INITIAL_GITHUB_USER_1 — required, first member's GitHub username
 *   - TALLY_INITIAL_GITHUB_USER_2 — required, second member's GitHub username
 *
 * The target database (local / dev / prod) is selected by the environment the
 * command runs under, not by a flag.
 *
 * Idempotent:
 *   - reuses an existing household if one already exists (single-household app)
 *   - skips any user whose githubId is already present
 *
 * Run with:
 *   npm run db:init-household
 */

import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import * as schema from '#server/db/schema.ts'
import { deriveInitials } from '#shared/utils/initials.utils.js'

if (!process.env.NUXT_DATABASE_URL) {
  throw new Error('NUXT_DATABASE_URL is not set')
}
if (!process.env.TALLY_INITIAL_GITHUB_USER_1) {
  throw new Error('TALLY_INITIAL_GITHUB_USER_1 is not set')
}
if (!process.env.TALLY_INITIAL_GITHUB_USER_2) {
  throw new Error('TALLY_INITIAL_GITHUB_USER_2 is not set')
}

const githubUsernames = [
  process.env.TALLY_INITIAL_GITHUB_USER_1,
  process.env.TALLY_INITIAL_GITHUB_USER_2,
]

// Match server/db/connection.ts — postgres-js driver with prepare:false for the
// Supabase transaction-mode pooler (:6543). node-postgres/pg.Pool breaks against
// the pooler (prepared statements + IPv4/6 resolution), same reason the app and
// the backfill scripts moved off it.
const client = postgres(process.env.NUXT_DATABASE_URL, { prepare: false, max: 1 })
const db = drizzle(client, { schema })

async function fetchGithubUser (username) {
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })

  if (res.status === 404) {
    throw new Error(`GitHub user '${username}' not found`)
  }
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status} for '${username}'`)
  }

  return res.json()
}

async function seedFirstHousehold () {
  console.log(`Seeding first household with users: ${githubUsernames.join(', ')}\n`)

  // Resolve both GitHub users up front (fail fast before writing anything).
  const ghUsers = []
  for (const username of githubUsernames) {
    ghUsers.push(await fetchGithubUser(username))
  }

  // One shared household. Idempotent: reuse an existing one (single-household app).
  let [household] = await db
    .select()
    .from(schema.households)
    .limit(1)

  if (household) {
    console.log(`Household already exists (${household.id}) — reusing.`)
  }
  else {
    ;[household] = await db
      .insert(schema.households)
      .values({
        name: `${ghUsers[0].login}'s household`,
        description: 'Auto-generated shared household.',
      })
      .returning()
    console.log(`Created household ${household.id}`)
  }

  // Insert both users into the household, in order (user 1 first = userOne slot).
  let created = 0
  let skipped = 0

  for (const ghUser of ghUsers) {
    const [existing] = await db
      .select({ id: schema.users.id, householdId: schema.users.householdId })
      .from(schema.users)
      .where(eq(schema.users.githubId, ghUser.id))
      .limit(1)

    if (existing) {
      console.log(`User ${ghUser.login} already exists (id=${existing.id}) — skipping.`)
      skipped++
      continue
    }

    const displayName = ghUser.name ?? ghUser.login

    const [user] = await db
      .insert(schema.users)
      .values({
        githubId: ghUser.id,
        householdId: household.id,
        username: ghUser.login,
        displayName,
        initials: deriveInitials(displayName),
        avatarUrl: ghUser.avatar_url,
      })
      .returning()

    console.log(`Created user ${user.id} (${user.username}, githubId=${user.githubId})`)
    created++
  }

  console.log('\n--- Seed Summary ---')
  console.log(`Household: ${household.id}`)
  console.log(`Users created: ${created}`)
  console.log(`Users skipped: ${skipped}`)

  await client.end()
}

seedFirstHousehold().catch(async (err) => {
  console.error('Seed failed:', err)
  await client.end()
  process.exit(1)
})
