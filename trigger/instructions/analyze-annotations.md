You are analyzing a receipt photo that has handwritten annotations.
You will receive the receipt image and a list of line items already extracted by OCR.

Carefully scan the ENTIRE image for handwritten marks. Initials or annotations may appear:
- Next to specific line items
- In the margins (top, bottom, sides)
- Between line items
- Multiple times on the same receipt

**Important — ignore printed tax-rate codes:** German (and many European) receipts often print a single-letter or single-digit code in an extra column right after the price on each line item — typically `A`, `B`, `1`, `2`, and sometimes other letters or symbols (e.g., `*`, `#`). These are the cash register's tax-rate codes (e.g., A = 19% VAT, B = 7%), printed by the machine, not handwritten. Do **not** report them as initials or annotations. Only report marks that are clearly handwritten (different ink, off-grid, irregular shape).

**Important — a strikethrough on just the price still counts as striking the item:** People voiding an item often strike through only the price column, leaving the item's description text untouched. That still means the item is removed from the total — report `type: strikethrough` for that line item even if the mark only crosses the price, not the description text.

Look for and identify ALL instances of:
1. Handwritten initials (e.g. "JN", "MM") — **always at least 2 characters**; a single letter is never initials. Report EVERY occurrence, even if the same initials appear multiple times.
2. Circled items — a circle may span multiple line items, list all items it covers
3. Struck-through items
4. Any other handwritten marks or annotations

## Binding marks to line items

The line items you receive are numbered — each entry has an explicit `index`. When a mark covers a line item, report **that item's `index`** as `lineItemIndex`, and copy its description verbatim into `item`.

- Use the `index` value given to you. Do not count positions yourself.
- `item` must match the OCR description exactly — it is a cross-check on the index, so do not paraphrase, translate, or tidy it.
- For marks not tied to any line item (margin initials, a circle around the total), set **both** `lineItemIndex` and `item` to `null`, and describe where it is in `location`.

Return JSON in this format:
{
  "annotations": [
    { "lineItemIndex": 0, "item": "Caesar Salad", "type": "initials", "value": "JN", "location": "next to item" },
    { "lineItemIndex": null, "item": null, "type": "initials", "value": "JN", "location": "top right corner" },
    { "lineItemIndex": 2, "item": "Pizza", "type": "circle", "value": null, "location": "circled" },
    { "lineItemIndex": 3, "item": "Dessert", "type": "strikethrough", "value": null, "location": "struck through" }
  ],
  "notes": "Any additional observations about the handwriting"
}

Important:
- Do NOT skip any handwritten marks. Report every single one.
- **If a circle or strikethrough spans multiple items, emit a SEPARATE annotation for EACH item it covers** — one entry per item, each with its own `lineItemIndex`. Never collapse a multi-item circle into a single entry.
- Every key must be present on every entry; use `null` where a value does not apply.
- If there are no handwritten annotations, return { "annotations": [], "notes": "No handwriting detected" }.
