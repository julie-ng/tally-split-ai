--
-- NOTES:
-- * Moves workflow_runs from `postgres_changes` to Broadcast — the last table on
--   the old transport (see notes/2026-07-26-realtime-data-flow-analysis.md §5
--   Phase 4). Not a bug fix: alignment, so ONE transport explains all liveness.
-- * Payload is camelCase, so the store's snake_case mapping (_mapStepFields) goes.
-- * Reverses 0017/0018: with Broadcast, `authenticated` needs NO table grant, NO
--   RLS policy and NO publication membership on workflow_runs — authorization is
--   the topic join against realtime.messages (0022). Strictly less exposure.
--
-- ⚠️ Per-step columns are listed EXPLICITLY. A new step means editing this
--    payload; the store derives its keys from WORKFLOW_STEP_REGISTRY, so a column
--    missing here silently never pushes.

--
-- CREATE PG FUNCTION
--
CREATE OR REPLACE FUNCTION public.broadcast_workflow_run_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
-- Harden security definer against schema-shadowing (CVE-2018-1058)
SET search_path = ''
AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object(
      'runId',        NEW.id,
      'uuid',         NEW.uuid,
      'uploadId',     NEW.upload_id,
      'householdId',  NEW.household_id,
      'triggerRunId', NEW.trigger_run_id,
      'status',       NEW.status,

      'ocrStatus',               NEW.ocr_status,
      'ocrStartedAt',            NEW.ocr_started_at,
      'ocrCompletedAt',          NEW.ocr_completed_at,
      'annotationsStatus',       NEW.annotations_status,
      'annotationsStartedAt',    NEW.annotations_started_at,
      'annotationsCompletedAt',  NEW.annotations_completed_at,
      'normalizeStatus',         NEW.normalize_status,
      'normalizeStartedAt',      NEW.normalize_started_at,
      'normalizeCompletedAt',    NEW.normalize_completed_at,
      'createExpenseStatus',     NEW.create_expense_status,
      'createExpenseStartedAt',  NEW.create_expense_started_at,
      'createExpenseCompletedAt', NEW.create_expense_completed_at,
      'adjustExpenseStatus',     NEW.adjust_expense_status,
      'adjustExpenseStartedAt',  NEW.adjust_expense_started_at,
      'adjustExpenseCompletedAt', NEW.adjust_expense_completed_at,

      'errors',       NEW.errors,
      'createdAt',    NEW.created_at,
      'completedAt',  NEW.completed_at
    ),
    TG_OP,
    'household:' || NEW.household_id || ':workflow_runs',
    true  -- private; must match the client channel's config
  );
  RETURN NULL;
END;
$$;

--> statement-breakpoint

DROP TRIGGER IF EXISTS broadcast_workflow_run_change ON public.workflow_runs;

--> statement-breakpoint

--
-- CREATE PG TRIGGER
--
CREATE TRIGGER broadcast_workflow_run_change
  AFTER INSERT OR UPDATE ON public.workflow_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_workflow_run_change();

--> statement-breakpoint

--
-- TEAR DOWN THE postgres_changes SETUP (0017 + 0018)
--
-- Membership check first: ALTER PUBLICATION ... DROP TABLE errors if absent.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'workflow_runs'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.workflow_runs;
  END IF;
END $$;

--> statement-breakpoint

DROP POLICY IF EXISTS "authenticated reads own household workflow_runs" ON public.workflow_runs;

--> statement-breakpoint

-- RLS stays ENABLED with no policy = deny-all for authenticated, which is what we
-- want. Server-side queries connect as `postgres` (BYPASSRLS) and are unaffected.
REVOKE SELECT ON public.workflow_runs FROM authenticated;
