-- Let an authenticated user RECEIVE broadcasts on any topic belonging to their own
-- household — `household:<householdId>:<resource>` (Phase 0 of
-- notes/2026-07-26-realtime-data-flow-analysis.md §5).
--
-- Policy only; the per-table triggers that publish come later (0023 = expenses).
-- Applying this alone changes nothing observable.
--
-- SELECT, not INSERT: we broadcast FROM the database, the browser only receives.
-- An INSERT policy would let clients broadcast to each other.
--
-- `auth.jwt() ->> 'sub'` NOT `auth.uid()` — auth.uid() hard-casts to uuid and our
-- ids are text nanoids, so it throws and the client is denied (see 0018). The
-- (SELECT ...) wrapper caches the claim as an initplan.
--
-- The public.users grant + self-only policy this subquery needs already exists
-- from 0018.
--
-- ⚠️ This policy is the ENTIRE household boundary for broadcast: it's evaluated
-- ONCE at join and cached for the connection, NOT per message (unlike
-- postgres_changes, which filters every row). A trigger that builds the wrong
-- topic leaks across households and nothing downstream catches it.

DO $$ BEGIN
  CREATE POLICY "authenticated receives own household broadcasts"
    ON realtime.messages FOR SELECT TO authenticated
    USING (
      realtime.messages.extension = 'broadcast'
      AND (SELECT realtime.topic()) LIKE 'household:' || (
        SELECT household_id
        FROM public.users
        WHERE id = (SELECT auth.jwt() ->> 'sub')
      ) || ':%'
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
