import { sql } from 'drizzle-orm'

/**
 * Drizzle `extras` fragment that selects a receipt's `uploadId` as a scalar
 * column: `extras: receiptsUtils.withUploadId`.
 *
 * The FK lives on `uploads.receipt_id` — the upload row exists before OCR
 * creates the receipt — so `receipts` has no `upload_id` column of its own. This
 * derives it with a correlated subquery, rather than joining the upload and
 * post-processing the response.
 *
 * IMPORTANT
 * - Use on EVERY receipt query so the list and by-id endpoints cannot drift
 *   apart. Both write the same store cache, so a shape difference means a
 *   TTL-fresh partial row shadows the fuller one — that is how the expense
 *   preview lost its receipt image.
 * - Single-valued only because of the `uploads_receipt_id_unique` partial index
 *   (migration 0029). Without that 1:1 guarantee the subquery could return more
 *   than one row and error.
 * - `null` for a receipt whose upload has been deleted.
 */
export const withUploadId = () => ({
  // BOTH sides of the correlation must be qualified. `fields.id` renders as a
  // bare "id", which Postgres resolves against the INNERMOST scope — the
  // subquery's own uploads — giving u.receipt_id = u.id, never true, so every
  // uploadId silently came back null. Drizzle aliases the outer table as
  // "receipts", so name it explicitly.
  uploadId: sql`(
    select u.id from ${schema.uploads} u where u.receipt_id = "receipts".id
  )`.as('upload_id'),
})
