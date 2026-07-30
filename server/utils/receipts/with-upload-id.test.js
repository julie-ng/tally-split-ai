import { describe, it, expect } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '#server/db/schema'
import { withUploadId } from './with-upload-id.js'

// `schema` is a Nuxt auto-import in app code; provide it as a global here.
globalThis.schema = schema

function generatedSql () {
  const db = drizzle.mock({ schema })
  const query = db.query.receipts.findMany({ extras: withUploadId })
  return new PgDialect().sqlToQuery(query.getSQL()).sql
}

function generatedSqlFindFirst () {
  const db = drizzle.mock({ schema })
  const query = db.query.receipts.findFirst({ extras: withUploadId })
  return new PgDialect().sqlToQuery(query.getSQL()).sql
}

describe('withUploadId (extras fragment)', () => {
  it('should select uploadId as a scalar column', () => {
    expect(generatedSql()).toMatch(/as "upload_id"/)
  })

  it('should read from uploads, not receipts', () => {
    expect(generatedSql()).toMatch(/from "uploads"/)
  })

  // REGRESSION GUARD — this shipped broken twice. BOTH sides of the correlation
  // must be qualified: a bare "id" resolves against the INNERMOST scope (the
  // subquery's own uploads), giving u.receipt_id = u.id — never true, so every
  // uploadId came back null with no error. The UI then showed "missing upload"
  // for every receipt.
  it('should qualify both sides of the correlation', () => {
    expect(generatedSql()).toMatch(/u\.receipt_id = "receipts"\.id/)
  })

  it('should never correlate against a bare id', () => {
    expect(generatedSql()).not.toMatch(/receipt_id = "id"/)
  })

  // findFirst and findMany must agree — the by-id endpoint uses findFirst, and
  // the outer alias has to match there too.
  it('should qualify the correlation in findFirst as well', () => {
    expect(generatedSqlFindFirst()).toMatch(/u\.receipt_id = "receipts"\.id/)
  })
})
