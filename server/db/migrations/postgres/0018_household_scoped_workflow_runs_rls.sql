-- Hand-written migration: replace the interim `using (true)` workflow_runs RLS
-- policy (0017) with a household-scoped one.
--
-- Why: 0017 shipped `using (true)` (any authenticated user reads any row) and the
-- browser narrowed to its household client-side. This moves the boundary into the
-- DB: an authenticated user now sees ONLY workflow_runs for their own household.
-- The client-side filter in app/stores/realtime.store.js is removed alongside this.
--
-- Household is derived from public.users, NOT from a token claim: the JWT carries
-- only `sub` (our user id), so switching households needs no token re-mint.
--
-- NOTE ON `auth.jwt() ->> 'sub'` (NOT `auth.uid()`): auth.uid() hard-casts the sub
-- claim to `uuid`. Our user ids are nanoids (text, from generateId()), so auth.uid()
-- would throw `invalid input syntax for type uuid` — which postgres_changes surfaces
-- as a stripped row + `errors: ["Error 401: Unauthorized"]`. `auth.jwt() ->> 'sub'`
-- returns text and compares directly to public.users.id. The (select ...) wrapper
-- lets Postgres cache the claim as an initplan (evaluated once, not per row).
--
-- The workflow_runs policy's subquery reads public.users, so the `authenticated`
-- role needs its own grant + RLS there. We grant SELECT on only (id, household_id)
-- and add a "see only your own row" policy (scoped by the `sub` claim — no lookup
-- into users itself, so no policy recursion). That's all the subquery needs, and
-- it keeps public.users otherwise closed to the authenticated role. Server-side
-- queries connect as `postgres` (BYPASSRLS) and are unaffected.
--
-- Idempotent: DROP ... IF EXISTS by the old name; CREATE guarded by DO blocks.

-- 1. public.users: grant + RLS + self-only SELECT policy (feeds the subquery below).
GRANT SELECT (id, household_id) ON public.users TO authenticated;--> statement-breakpoint

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DO $$ BEGIN
  CREATE POLICY "authenticated reads own user row"
    ON public.users FOR SELECT TO authenticated
    USING ( id = (SELECT auth.jwt() ->> 'sub') );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- 2. public.workflow_runs: swap the interim `using (true)` policy (0017) for the
--    household-scoped one.
DROP POLICY IF EXISTS "authenticated can read workflow_runs" ON public.workflow_runs;--> statement-breakpoint

DO $$ BEGIN
  CREATE POLICY "authenticated reads own household workflow_runs"
    ON public.workflow_runs FOR SELECT TO authenticated
    USING (
      household_id IN (
        SELECT household_id
        FROM public.users
        WHERE id = (SELECT auth.jwt() ->> 'sub')
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
