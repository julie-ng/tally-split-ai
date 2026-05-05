import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'

const env = process.env.SUPABASE_ENV ?? 'dev'
const envFile = `.env.supabase.${env}`

config({ path: envFile })

if (!process.env.SUPABASE_DATABASE_URL) {
  throw new Error(`SUPABASE_DATABASE_URL is not set in ${envFile}`)
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema.ts',
  out: './server/db/migrations/postgres',
  dbCredentials: {
    url: process.env.SUPABASE_DATABASE_URL,
  },
})
