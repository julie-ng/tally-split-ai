import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle> | null = null

/**
 * Get database connection (singleton pattern)
 */
export function useDB() {
  if (_db) {
    return _db
  }

  const databaseUrl = process.env.DATABASE_URL || './data/receipts.db'
  
  const sqlite = new Database(databaseUrl)
  sqlite.pragma('journal_mode = WAL') // Enable Write-Ahead Logging for better performance
  
  _db = drizzle(sqlite, { schema })
  
  return _db
}

/**
 * Export schema for use in other files
 */
export { schema }
