import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle> | null = null
let _client: ReturnType<typeof postgres> | null = null

/**
 * Use Supabase's transaction-mode pooler (port 6543),
 *
 * Required for serverless:
 * - `prepare: false` — prepared statements break across pooled connections
 * - `max: 1` — high per-instance pool sizes exhaust the pooler
 */
export function useDB () {
  if (_db) {
    return _db
  }

  const connectionString = process.env.NUXT_DATABASE_URL || process.env.DATABASE_URL

  // see ARCHITECTURE.md for details
  _client = postgres(connectionString, {
    prepare: false,
    max: 5,  // 1 is a bottleneck, 10 is default. split the diff.
    idle_timeout: 5, // low timeout per Decerl docs
  })
  _db = drizzle(_client, { schema })

  return _db
}

/**
 * Export schema for use in other files
 */
export { schema }
