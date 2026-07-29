-- Custom SQL migration file, put your code below! ----
-- NOTES:
-- * Drops `uploads.analysis_status` — a coarse rollup NOTHING read. Its only UI
--   consumer rendered it as a raw enum string on a diagnostic tab; the uploads
--   table reads run/step status from workflow_runs instead.
-- * Six writers removed (orchestrator ×2, workflows/[uploadId] ×2, reconcile,
--   status.put). `analyzed_at` STAYS — it records WHEN, which workflow_runs
--   doesn't carry per-upload; status.put now derives it from a terminal run status.
-- * Also rewrites 0025's uploads broadcast payload, which carried the column.
--
-- ⚠️ NOT a fix for the expired-run disagreement (run `expired` + steps `pending`).
--    Both of those live in workflow_runs; see project_expired_run_step_status_reconcile.

--
-- REPLACE PG FUNCTION — uploads scalars payload, minus analysisStatus
--
CREATE OR REPLACE FUNCTION public.broadcast_upload_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
-- Harden security definer against schema-shadowing (CVE-2018-1058)
SET search_path = ''
AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object(
      'uploadId',         NEW.id,
      'householdId',      NEW.household_id,
      'receiptId',        NEW.receipt_id,
      'title',            NEW.title,
      'status',           NEW.status,
      'analyzedAt',       NEW.analyzed_at,
      'originalFilename', NEW.original_filename,
      'contentType',      NEW.content_type,
      'size',             NEW.size,
      'blobName',         NEW.blob_name,
      'blobUrl',          NEW.blob_url,
      'thumbnailName',    NEW.thumbnail_name,
      'thumbnailUrl',     NEW.thumbnail_url,
      'uploadedAt',       NEW.uploaded_at
    ),
    TG_OP,
    'household:' || NEW.household_id || ':uploads',
    true  -- private; must match the client channel's config
  );
  RETURN NULL;
END;
$$;

--> statement-breakpoint

ALTER TABLE public.uploads DROP COLUMN IF EXISTS analysis_status;
