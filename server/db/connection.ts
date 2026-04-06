import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle> | null = null
let _pool: InstanceType<typeof pg.Pool> | null = null

/**
 * Get database connection (singleton pattern)
 */
export function useDB () {
  if (_db) {
    return _db
  }

  const connectionString = process.env.NUXT_DATABASE_URL
    || process.env.DATABASE_URL
    || 'postgresql://receipts:localdev@localhost:5432/ai_receipts'

  _pool = new pg.Pool({ connectionString })
  _db = drizzle(_pool, { schema })

  return _db
}

/**
 * Export schema for use in other files
 */
export { schema }
