-- Broadcast expense changes to `household:<householdId>:expenses` (Phase 1 of
-- notes/2026-07-26-realtime-data-flow-analysis.md §5). Requires 0022's policy.
--
-- Payload = explicit contract in camelCase, so the store's ingest needs no
-- mapping. `NEW` is the whole post-write row, so every message is a complete
-- scalar SNAPSHOT (NULLs sent as `null`, not omitted) — safe to merge client-side.
-- No jsonb_strip_nulls(): the store must be able to learn a value BECAME null.
--
-- ⚠️ List EVERY scalar the UI renders. A column missing here silently never
-- pushes. Relations (receipt) can't be joined from a row trigger — hence merge,
-- not replace, in ingestExpense().
--
-- ⚠️ The topic string is the ENTIRE household boundary: 0022's policy is checked
-- once at join, never per message. Build it from NEW.household_id only — never via
-- the receipt join (receipt_id is NULLABLE; that's been a real bug here 3x).
--
-- SET search_path = '' hardens SECURITY DEFINER against schema-shadowing
-- (CVE-2018-1058): unqualified names could otherwise resolve to an attacker's
-- objects and run as the owner. Hence everything below is schema-qualified.

CREATE OR REPLACE FUNCTION public.broadcast_expense_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object(
      'expenseId',    NEW.id,
      'receiptId',    NEW.receipt_id,
      'householdId',  NEW.household_id,
      'title',        NEW.title,
      'date',         NEW.date,
      'splitAmount',  NEW.split_amount,
      'userOneShare', NEW.user_one_share,
      'userTwoShare', NEW.user_two_share,
      'userOneId',    NEW.user_one_id,
      'userTwoId',    NEW.user_two_id,
      'paidByUserId', NEW.paid_by_user_id,
      'paidByMatch',  NEW.paid_by_match,
      'isSettled',    NEW.is_settled,
      'settledAt',    NEW.settled_at,
      'needsReview',  NEW.needs_review
    ),
    TG_OP,
    'household:' || NEW.household_id || ':expenses',
    true  -- private; must match the client channel's config
  );
  RETURN NULL;
END;
$$;--> statement-breakpoint

-- No DELETE: it needs OLD, and the deleting client already updates optimistically.
-- The other member's session won't see it vanish — accepted for 2 users.
DROP TRIGGER IF EXISTS broadcast_expense_change ON public.expenses;--> statement-breakpoint

CREATE TRIGGER broadcast_expense_change
  AFTER INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_expense_change();
