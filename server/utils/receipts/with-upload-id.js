/**
 * Flatten a receipt's `upload` relation down to a scalar `uploadId`.
 *
 * The FK lives on `uploads.receiptId` (the upload row exists before OCR creates
 * the receipt), so a receipt has no `upload_id` column of its own — the id can
 * only come from the relation. This projects it so responses carry a plain id
 * instead of leaking a foreign domain's row.
 *
 * IMPORTANT
 * - Use this on EVERY receipt response so the list and by-id endpoints cannot
 *   drift apart.
 * - `uploadId` is null while the upload is still pre-OCR (no receipt yet), and
 *   for any receipt whose upload has been deleted.
 *
 * @param {object} receipt - receipt row queried `with: { upload: … }`
 * @param {object} [options]
 * @param {boolean} [options.keepUpload=false] - also keep the embedded `upload`
 *   object. Transitional only — see the callers' removal notes.
 * @returns {object} receipt with `uploadId`, and `upload` removed unless kept
 */
export function receiptWithUploadId (receipt, { keepUpload = false } = {}) {
  if (!receipt) {
    return receipt
  }

  const { upload, ...rest } = receipt

  return {
    ...rest,
    ...(keepUpload ? { upload } : {}),
    uploadId: upload?.id ?? null,
  }
}
