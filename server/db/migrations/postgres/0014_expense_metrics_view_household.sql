-- Hand-written view migration: fix v_expense_metrics to scope by the expense's
-- OWN household_id, not the receipt's.
--
-- Bug: the view sourced household_id (and receipt_date) from the LEFT-JOINed
-- receipts row. For STANDALONE expenses (receipt_id IS NULL) those columns were
-- NULL, so dashboard/metrics.get.js's `WHERE household_id = $1` silently dropped
-- every standalone expense (NULL = X is false in SQL) — undercounting the
-- dashboard. Same receipt-join scoping bug already fixed in set-settled.js,
-- delete-many.js, and summary.get.js.
--
-- Fix: household_id now comes from expenses.household_id (NOT NULL, write-once).
-- receipt_date COALESCEs the expense's own date over the receipt's so standalone
-- rows still have a date. Column names/order are unchanged → CREATE OR REPLACE.
CREATE OR REPLACE VIEW v_expense_metrics AS
SELECT
  e.id AS expense_id,
  e.receipt_id,
  e.household_id,
  COALESCE(e.date, r.date) AS receipt_date,
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
