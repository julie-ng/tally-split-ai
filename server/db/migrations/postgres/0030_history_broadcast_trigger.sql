-- Broadcast change-history writes to `household:<householdId>:history`.
--
-- Two differences from the four triggers before this one (0023–0026). Both are
-- deliberate; read them before editing.
--
-- 1. STATEMENT-LEVEL, not row-level.
--    All three writers in server/utils/change-history/ insert their field rows in
--    ONE statement (`diffs.map()` → one INSERT). A row trigger would fire once per
--    FIELD — a 5-field edit sending 5 identical messages. `FOR EACH STATEMENT`
--    with a transition table fires once per write, and `DISTINCT` collapses it to
--    one message per affected entity.
--
-- 2. SIGNAL, not snapshot.
--    The other four send a complete scalar snapshot of NEW. This one sends only
--    ids; the client re-fetches via /api/history/*. A history ENTRY is not a row —
--    it is a `changes` row joined to N history rows and regrouped into
--    `{ id, source, confidence, ..., fields: [...] }`. That regrouping lives in
--    server/api/history/*/[id].get.js. Rebuilding it in plpgsql would put the same
--    shape in two languages, and a drift between them would fail SILENTLY: the
--    broadcast path would render differently from the fetch path, only for whoever
--    happened to be connected. One extra GET on a cold path is the better trade.
--
-- ⚠️ Why not trigger on `changes` itself, which is the natural-looking table:
--    trackChanges() inserts the `changes` row BEFORE its history rows, in the same
--    transaction. An AFTER INSERT trigger there fires while the row is still
--    unattached — no entity id, no entity type, and so no household to build the
--    topic from. The history tables are the first point where a change is bound to
--    an entity.
--
-- ⚠️ receipt_id / expense_id are NULLABLE, so the loop guards on IS NOT NULL. A
--    null would otherwise build the topic `household::history` — which no client
--    subscribes to, and which would silently drop the message rather than error.
--    (0023's header records this same nullable-FK trap biting three times.)
--
-- SET search_path = '' hardens SECURITY DEFINER against schema-shadowing
-- (CVE-2018-1058), hence every name below is schema-qualified.

--
-- CREATE PG FUNCTION — expense history
--
CREATE OR REPLACE FUNCTION public.broadcast_expense_history_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  rec record;
BEGIN
  -- One message per (entity, change). trackBatchChanges() writes ONE change
  -- spanning N entities in a single statement, so DISTINCT is over the pair:
  -- each of those N expenses needs its own message to refresh its own cache.
  FOR rec IN
    SELECT DISTINCT h.expense_id, h.change_id, e.household_id
    FROM inserted h
    JOIN public.expenses e ON e.id = h.expense_id
    WHERE h.expense_id IS NOT NULL
  LOOP
    PERFORM realtime.send(
      jsonb_build_object(
        'entityType',  'expense',
        'entityId',    rec.expense_id,
        'changeId',    rec.change_id,
        'householdId', rec.household_id
      ),
      TG_OP,
      'household:' || rec.household_id || ':history',
      true  -- private; must match the client channel's config
    );
  END LOOP;
  RETURN NULL;
END;
$$;--> statement-breakpoint

--
-- CREATE PG FUNCTION — receipt history
--
CREATE OR REPLACE FUNCTION public.broadcast_receipt_history_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT DISTINCT h.receipt_id, h.change_id, r.household_id
    FROM inserted h
    JOIN public.receipts r ON r.id = h.receipt_id
    WHERE h.receipt_id IS NOT NULL
  LOOP
    PERFORM realtime.send(
      jsonb_build_object(
        'entityType',  'receipt',
        'entityId',    rec.receipt_id,
        'changeId',    rec.change_id,
        'householdId', rec.household_id
      ),
      TG_OP,
      'household:' || rec.household_id || ':history',
      true
    );
  END LOOP;
  RETURN NULL;
END;
$$;--> statement-breakpoint

-- No UPDATE or DELETE: history is append-only. Rows go only when the entity
-- cascades away, and the client that deleted it already updated optimistically.
DROP TRIGGER IF EXISTS broadcast_expense_history_change ON public.expense_history;--> statement-breakpoint

CREATE TRIGGER broadcast_expense_history_change
  AFTER INSERT ON public.expense_history
  REFERENCING NEW TABLE AS inserted
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.broadcast_expense_history_change();--> statement-breakpoint

DROP TRIGGER IF EXISTS broadcast_receipt_history_change ON public.receipt_history;--> statement-breakpoint

CREATE TRIGGER broadcast_receipt_history_change
  AFTER INSERT ON public.receipt_history
  REFERENCING NEW TABLE AS inserted
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.broadcast_receipt_history_change();
