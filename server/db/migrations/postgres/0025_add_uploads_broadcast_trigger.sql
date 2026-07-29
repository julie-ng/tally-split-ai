--
-- NOTES:
-- * Changes broadcasted to `household:<householdId>:uploads`
-- * TWO triggers on one table (see analysis doc §4.3.1 payload tiers):
--     1. scalars     — fires on any INSERT/UPDATE
--     2. annotations — fires ONLY on `UPDATE OF annotations_json`
-- * `NEW` is snapshot. So safe to merge client-side
-- * ocr_json / ocr_text are NEVER broadcast (100s of KB). A leaf that renders
--   line items or polygons asks its store, which fetches that field from /api.
--
-- ⚠️ `UPDATE OF col` fires when the column is in the SET list, NOT when its value
--    changes. Fine here: analyze-annotations.js issues a targeted single-column PUT.

--
-- CREATE PG FUNCTION — scalars
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
      'analysisStatus',   NEW.analysis_status,
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

--
-- CREATE PG FUNCTION — annotations (tier 2)
--
-- Own event name so the store routes it to its own ingest. Broadcasting this jsonb
-- on every upload write would be wasteful; scoping to the column means it ships
-- once per run, when analyze-annotations actually writes it.
--
CREATE OR REPLACE FUNCTION public.broadcast_upload_annotations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object(
      'uploadId',        NEW.id,
      'householdId',     NEW.household_id,
      'annotationsJson', NEW.annotations_json
    ),
    'ANNOTATIONS',
    'household:' || NEW.household_id || ':uploads',
    true
  );
  RETURN NULL;
END;
$$;

--> statement-breakpoint

DROP TRIGGER IF EXISTS broadcast_upload_change ON public.uploads;

--> statement-breakpoint

DROP TRIGGER IF EXISTS broadcast_upload_annotations ON public.uploads;

--> statement-breakpoint

--
-- CREATE PG TRIGGER — scalars
--
CREATE TRIGGER broadcast_upload_change
  AFTER INSERT OR UPDATE ON public.uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_upload_change();

--> statement-breakpoint

--
-- CREATE PG TRIGGER — annotations
--
CREATE TRIGGER broadcast_upload_annotations
  AFTER UPDATE OF annotations_json ON public.uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_upload_annotations();
