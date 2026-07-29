--
-- NOTES:
-- * Converts the 12 remaining naive `timestamp` columns to `timestamptz`.
-- * WHY: a naive column drops the offset, so the browser reads the stored digits
--   as LOCAL time. In Berlin (UTC+2) a just-created upload rendered "2 hours ago".
--   Per rules/database-timestamps.md: instants are timestamptz.
-- * SAFE because every value is already UTC — verified `now()::timestamp` returns
--   UTC on this server, and client writes send UTC ISO strings. So
--   `AT TIME ZONE 'UTC'` REINTERPRETS the same digits as UTC rather than shifting
--   them. Anything written while the DB ran non-UTC would shift; it never has.
-- * The per-step workflow_runs timestamps (0019) were already timestamptz and are
--   untouched.
--
-- ⚠️ v_expense_metrics selects expenses.created_at, so it must be DROPPED before
--    altering that column and recreated after — Postgres refuses to alter a column
--    a view depends on. Recreated verbatim from 0014 below.

DROP VIEW IF EXISTS v_expense_metrics;

--> statement-breakpoint

--
-- RECEIPTS
--
ALTER TABLE public.receipts
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

--> statement-breakpoint

--
-- UPLOADS
--
ALTER TABLE public.uploads
  ALTER COLUMN created_at  TYPE timestamptz USING created_at  AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at  TYPE timestamptz USING updated_at  AT TIME ZONE 'UTC',
  ALTER COLUMN uploaded_at TYPE timestamptz USING uploaded_at AT TIME ZONE 'UTC',
  ALTER COLUMN analyzed_at TYPE timestamptz USING analyzed_at AT TIME ZONE 'UTC';

--> statement-breakpoint

--
-- EXPENSES
--
ALTER TABLE public.expenses
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC',
  ALTER COLUMN settled_at TYPE timestamptz USING settled_at AT TIME ZONE 'UTC';

--> statement-breakpoint

--
-- WORKFLOW_RUNS (run-level only; per-step columns are already timestamptz)
--
ALTER TABLE public.workflow_runs
  ALTER COLUMN created_at   TYPE timestamptz USING created_at   AT TIME ZONE 'UTC',
  ALTER COLUMN completed_at TYPE timestamptz USING completed_at AT TIME ZONE 'UTC';

--> statement-breakpoint

--
-- CHANGES
--
ALTER TABLE public.changes
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

--> statement-breakpoint

--
-- RECREATE v_expense_metrics — verbatim from 0014, no logic change.
--
CREATE VIEW v_expense_metrics AS
SELECT
  e.id AS expense_id,
  e.receipt_id,
  e.household_id,
  COALESCE(e.date::text, r.date) AS receipt_date,
  e.paid_by_match,
  e.is_settled,
  e.created_at AS expense_created_at,
  (
    SELECT c.confidence
    FROM changes c
    JOIN expense_history eh ON eh.change_id = c.id
    WHERE eh.expense_id = e.id
      AND c.source LIKE 'task:%'
    ORDER BY c.created_at DESC
    LIMIT 1
  ) AS llm_confidence,
  EXISTS (
    SELECT 1
    FROM changes c
    JOIN expense_history eh ON eh.change_id = c.id
    WHERE eh.expense_id = e.id
      AND eh.field = 'paidByUserId'
      AND c.source LIKE 'user:%'
  ) AS paid_by_overridden_by_human
FROM expenses e
LEFT JOIN receipts r ON r.id = e.receipt_id;
