/**
 * Upload QUEUE status — the browser-side transfer job.
 *
 * ⚠️ CLIENT-ONLY. These values NEVER reach Postgres.
 *
 * The browser uploads directly to Azure Blob Storage via SAS URLs, so the whole
 * transfer lifecycle lives in the client (memory + localStorage). Only a
 * finished upload produces a DB write. The persisted blob row has its own,
 * separate vocabulary — see `upload-status.js` (UPLOAD_STATUS).
 *
 * The two enums COLLIDE on 'queued', 'completed' and 'failed' while describing
 * different subjects (a browser transfer vs. a stored blob row). That overlap is
 * a coincidence of vocabulary, not a shared domain — which is why they are two
 * enums and not one. Translating between them is an explicit, named step:
 * `uploadStepStatus()` in `app/utils/upload-step-status.utils.js`.
 *
 * ⚠️ VALUES ARE FROZEN. They are persisted in localStorage by
 * `local-storage-serializer.utils.js`, so renaming one breaks restore for
 * uploads that were in flight when the tab closed.
 *
 * Lifecycle: QUEUED → IN_PROGRESS → COMPLETED | FAILED
 *            (INTERRUPTED is set on page load for rows caught mid-transfer)
 */
export const UPLOAD_QUEUE_STATUS = {
  // Waiting for a concurrency slot; nothing sent yet.
  QUEUED: 'queued',
  // Bytes are transferring to Azure.
  IN_PROGRESS: 'in-progress',
  // Bytes finished. NOTE: the DB row's equivalent is UPLOAD_STATUS.UPLOADED —
  // different word, same moment.
  COMPLETED: 'completed',
  // The browser's PUT to Azure failed. Retryable via retryUpload().
  FAILED: 'failed',
  // The page was closed/reloaded mid-transfer, so the job can never finish.
  // Set by markInterrupted() on load. Distinct from FAILED: nothing errored,
  // we just lost the runtime that was doing the work.
  INTERRUPTED: 'interrupted',
}

/*
 * No plural array export — this enum backs no Drizzle column and no Zod schema
 * (it is client-only). See README.md.
 */
