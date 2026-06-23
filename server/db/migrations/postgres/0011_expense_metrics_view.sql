-- Hand-written view migration: recreate the metrics view as v_expense_metrics
-- against the renamed expenses / expense_history tables.
-- The old v_split_metrics was already dropped in 0010 (DROP VIEW IF EXISTS).
-- The c.source LIKE 'task:%' / 'user:%' filters are unchanged (task IDs not renamed).
CREATE OR REPLACE VIEW v_expense_metrics AS
SELECT
  e.id AS expense_id,
  e.receipt_id,
  r.household_id,
  r.date AS receipt_date,
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
