import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema.ts',
  out: './server/db/migrations/postgres',
  dbCredentials: {
    url: process.env.NUXT_DATABASE_URL
      || process.env.DATABASE_URL
      || 'postgresql://receipts:localdev@localhost:5432/ai_receipts',
  },
})
