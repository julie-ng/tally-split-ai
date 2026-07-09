-- Hand-written migration: authorize Supabase Realtime (postgres_changes) to
-- deliver workflow_runs row data to the browser's authenticated-role connection.
--
-- Why: postgres_changes enforces table GRANTS + RLS for the connected Postgres
-- role. The Realtime store connects with a `role: authenticated` JWT. Without a
-- grant + an RLS SELECT policy for `authenticated`, Supabase delivers the change
-- EVENT but strips the row (payload.new = {}, errors: ["Error 401:
-- Unauthorized"]). See docs/REALTIME.md.
--
-- The policy is INTERIM: `using (true)` lets any authenticated user read any
-- workflow_runs row; the client-side household filter (workflow_runs.household_id
-- vs the user's household) narrows it. Tightening to a household-scoped policy is
-- the Plan-2 RLS work (needs the household id in the JWT).
--
-- Idempotent so a re-run (or a run after a manual apply on an existing env) is
-- safe: grants are naturally idempotent; the policy is guarded by a DO block.

-- Grant: let the authenticated role read the table.
GRANT SELECT ON public.workflow_runs TO authenticated;--> statement-breakpoint

-- Enable RLS. (No-op if already enabled.)
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- Interim SELECT policy for authenticated. Guard against duplicate on re-run.
DO $$ BEGIN
  CREATE POLICY "authenticated can read workflow_runs"
    ON public.workflow_runs FOR SELECT TO authenticated USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Add the table to the Realtime publication. ALTER PUBLICATION ADD TABLE errors
-- if the table is already a member; rather than depend on the exact exception
-- class, check membership first and only add when absent (fully idempotent).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'workflow_runs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_runs;
  END IF;
END $$;
