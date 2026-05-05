/**
 * Seed: First user
 *
 * Bootstraps a fresh database with the first authorized user (closed user
 * set — OAuth login only refreshes existing users, so the very first user
 * has to be inserted out-of-band).
 *
 * Loads .env.supabase.<SUPABASE_ENV> (defaults to "dev") and reads:
 *   - SUPABASE_DATABASE_URL — required
 *   - TALLY_INITIAL_GITHUB_USER — required, GitHub username (login)
 *
 * Idempotent: skips if a user with the resolved githubId already exists.
 *
 * Run with:
 *   SUPABASE_ENV=dev  npx tsx server/db/seeds/seed-first-user.js
 *   SUPABASE_ENV=prod npx tsx server/db/seeds/seed-first-user.js
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { config } from 'dotenv'
import * as schema from '#server/db/schema.ts'
import { deriveInitials } from '#shared/utils/initials.utils.js'

const env = process.env.SUPABASE_ENV ?? 'dev'
const envFile = `.env.supabase.${env}`
config({ path: envFile })

if (!process.env.SUPABASE_DATABASE_URL) {
  throw new Error(`SUPABASE_DATABASE_URL is not set in ${envFile}`)
}
if (!process.env.TALLY_INITIAL_GITHUB_USER) {
  throw new Error(`TALLY_INITIAL_GITHUB_USER is not set in ${envFile}`)
}

const githubUsername = process.env.TALLY_INITIAL_GITHUB_USER
const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DATABASE_URL })
const db = drizzle(pool, { schema })

async function seedFirstUser () {
  console.log(`Seeding first user from ${envFile}: ${githubUsername}\n`)

  const ghResponse = await fetch(`https://api.github.com/users/${encodeURIComponent(githubUsername)}`, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })

  if (ghResponse.status === 404) {
    throw new Error(`GitHub user '${githubUsername}' not found`)
  }
  if (!ghResponse.ok) {
    throw new Error(`GitHub API error ${ghResponse.status}`)
  }

  const ghUser = await ghResponse.json()

  const [existing] = await db
    .select({ id: schema.users.id, householdId: schema.users.householdId })
    .from(schema.users)
    .where(eq(schema.users.githubId, ghUser.id))
    .limit(1)

  if (existing) {
    console.log(`User already exists (id=${existing.id}, householdId=${existing.householdId}). Skipping.`)
    await pool.end()
    return
  }

  const displayName = ghUser.name ?? ghUser.login

  const [household] = await db
    .insert(schema.households)
    .values({
      name: `${ghUser.login}'s household`,
      description: 'Auto-generated personal household.',
    })
    .returning()

  console.log(`Created household ${household.id}`)

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

  await pool.end()
}

seedFirstUser().catch((err) => {
  console.error(err)
  process.exit(1)
})
