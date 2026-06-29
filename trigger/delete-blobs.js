import { task, logger } from '@trigger.dev/sdk/v3'

const TASK_ID = 'delete-blobs'

/**
 * Delete Azure blobs via pre-signed DELETE SAS URLs.
 *
 * The server mints short-lived (5 min) DELETE-only SAS URLs — one per blob
 * (full image + thumbnail) — and passes them in the payload. This task just
 * fires an HTTP DELETE at each, so it never needs the storage account key or any
 * Azure SDK / env vars.
 *
 * Idempotent: a 404 (blob already gone) counts as success, so Trigger's retries
 * are safe. Other failures throw to trigger a retry; the SAS URLs are valid for
 * 5 minutes, so retries beyond that window will 403 and the run will fail — by
 * design, since a stuck blob is an orphan, not a correctness problem.
 *
 * NO CALLBACK (yet): unlike the workflow tasks, this fires no callback into our
 * API — it has no HMAC scope (TASK_PERMISSIONS['delete-blobs'] = []) and the
 * server doesn't track the run's outcome. FUTURE: add a callback so a failed
 * blob deletion (exhausted retries → orphaned blobs) is reported back and
 * surfaced/alerted, instead of only living in Trigger's run logs. Until then, a
 * permanently-failed run = silently orphaned blobs (private + SAS-gated, so no
 * security/correctness issue, just wasted storage).
 *
 * @param {object} payload
 * @param {string[]} payload.blobDeleteUrls - full SAS DELETE URLs
 */
export const deleteBlobs = task({
  id: TASK_ID,
  maxDuration: 60,
  run: async (payload) => {
    const { blobDeleteUrls = [] } = payload

    if (blobDeleteUrls.length === 0) {
      logger.info('No blobs to delete')
      return { requested: 0, deleted: 0, failed: 0 }
    }

    let deleted = 0
    const failures = []

    for (const url of blobDeleteUrls) {
      const res = await fetch(url, { method: 'DELETE' })

      // 202/200 = deleted; 404 = already gone (idempotent success).
      if (res.ok || res.status === 404) {
        deleted++
        continue
      }

      // Log without the SAS query string (it's a credential).
      const blobRef = url.split('?')[0]
      failures.push({ blob: blobRef, status: res.status })
      logger.error('Failed to delete blob', { blob: blobRef, status: res.status })
    }

    if (failures.length > 0) {
      // Throw so Trigger retries the whole run. Already-deleted blobs 404 → no
      // double-delete harm on retry.
      throw new Error(`Failed to delete ${failures.length} of ${blobDeleteUrls.length} blob(s)`)
    }

    logger.info('Deleted blobs', { requested: blobDeleteUrls.length, deleted })
    return { requested: blobDeleteUrls.length, deleted, failed: 0 }
  },
})
