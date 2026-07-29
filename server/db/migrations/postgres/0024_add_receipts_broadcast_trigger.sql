--
-- NOTES:
-- * Changes broadcasted to `household:<householdId>:receipts`
-- * Payload = every scalar column except created_at/updated_at, camelCase.
-- * `NEW` is snapshot. So safe to merge client-side

--
-- CREATE PG FUNCTION, with broadcast schema
--
CREATE OR REPLACE FUNCTION public.broadcast_receipt_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
-- Harden security defining against schema-shadowing (CVE-2018-1058)
SET search_path = ''
AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object(
      'receiptId',       NEW.id,
      'householdId',     NEW.household_id,
      'title',           NEW.title,
      'merchantName',    NEW.merchant_name,
      'merchantAddress', NEW.merchant_address,
      'merchantPhone',   NEW.merchant_phone,
      'date',            NEW.date,
      'time',            NEW.time,
      'subtotal',        NEW.subtotal,
      'tax',             NEW.tax,
      'tip',             NEW.tip,
      'total',           NEW.total,
      'currency',        NEW.currency
    ),
    TG_OP,
    'household:' || NEW.household_id || ':receipts',
    true  -- private; must match the client channel's config
  );
  RETURN NULL;
END;
$$;

--> statement-breakpoint

DROP TRIGGER IF EXISTS broadcast_receipt_change ON public.receipts;

--> statement-breakpoint

--
-- CREATE PG TRIGGER  --
--
CREATE TRIGGER broadcast_receipt_change
  AFTER INSERT OR UPDATE ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_receipt_change();
