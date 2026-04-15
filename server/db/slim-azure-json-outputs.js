// eslint-disable @stylistic/multiline-ternary
/**
 * Migration Script: Slim ocrJson and annotationsJson on existing uploads
 *
 * ocrJson: Drops pages[].words[], pages[].lines[], analyzeResult.content,
 *          and other unused fields. Keeps documents, page dimensions, styles, metadata.
 *
 * annotationsJson: Flattens from { raw, annotations: { annotations, notes } }
 *                  to { model, usage, annotations, notes }.
 *
 * Idempotent — safe to run multiple times. Checks structure before transforming.
 *
 * Run with: node server/db/slim-azure-json-outputs.js
 *
 * Requirements:
 * - NUXT_DATABASE_URL environment variable set
 */

import 'dotenv/config'
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { isNotNull } from 'drizzle-orm'
import * as schema from './schema.ts'
import { slimOcrResponse } from '../utils/azure-ocr/slim-ocr-response.js'

const connectionString = process.env.NUXT_DATABASE_URL
if (!connectionString) {
  console.error('❌ NUXT_DATABASE_URL is not set')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString })
const db = drizzle(pool, { schema })

async function slimOcrJsonRecords () {
  const uploads = await db
    .select({ id: schema.uploads.id, ocrJson: schema.uploads.ocrJson })
    .from(schema.uploads)
    .where(isNotNull(schema.uploads.ocrJson))

  let updated = 0
  let skipped = 0

  for (const upload of uploads) {
    // Already slimmed if pages[0] has no words/lines
    const page = upload.ocrJson?.analyzeResult?.pages?.[0]
    if (page && !page.words && !page.lines) {
      skipped++
      continue
    }

    const slimmed = slimOcrResponse(upload.ocrJson)

    await pool.query(
      'UPDATE uploads SET ocr_json = $1 WHERE id = $2',
      [JSON.stringify(slimmed), upload.id],
    )

    updated++
  }

  console.log(`ocrJson: ${updated} updated, ${skipped} already slim, ${uploads.length} total`)
}

async function slimAnnotationsJsonRecords () {
  const uploads = await db
    .select({ id: schema.uploads.id, annotationsJson: schema.uploads.annotationsJson })
    .from(schema.uploads)
    .where(isNotNull(schema.uploads.annotationsJson))

  let updated = 0
  let skipped = 0

  for (const upload of uploads) {
    const ann = upload.annotationsJson

    // Already in new format if there's no 'raw' key
    if (!ann?.raw) {
      skipped++
      continue
    }

    const slimmed = {
      model: ann.raw?.model ?? null,
      usage: ann.raw?.usage
        ? {
            prompt_tokens: ann.raw.usage.prompt_tokens,
            completion_tokens: ann.raw.usage.completion_tokens,
            total_tokens: ann.raw.usage.total_tokens,
          }
        : null,
      annotations: ann.annotations?.annotations ?? [],
      notes: ann.annotations?.notes ?? null,
    }

    await pool.query(
      'UPDATE uploads SET annotations_json = $1 WHERE id = $2',
      [JSON.stringify(slimmed), upload.id],
    )

    updated++
  }

  console.log(`annotationsJson: ${updated} updated, ${skipped} already slim, ${uploads.length} total`)
}

async function main () {
  console.log('Slimming Azure JSON outputs...\n')

  await slimOcrJsonRecords()
  await slimAnnotationsJsonRecords()

  console.log('\n✅ Done')
  await pool.end()
}

main().catch((err) => {
  console.error('❌ Migration failed:', err)
  pool.end()
  process.exit(1)
})
