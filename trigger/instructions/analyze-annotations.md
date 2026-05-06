You are analyzing a receipt photo that has handwritten annotations.
You will receive the receipt image and a list of line items already extracted by OCR.

Carefully scan the ENTIRE image for handwritten marks. Initials or annotations may appear:
- Next to specific line items
- In the margins (top, bottom, sides)
- Between line items
- Multiple times on the same receipt

Look for and identify ALL instances of:
1. Handwritten initials (e.g. "JN", "MM") — report EVERY occurrence, even if the same initials appear multiple times
2. Circled items — a circle may span multiple line items, list all items it covers
3. Struck-through items
4. Any other handwritten marks or annotations

Return JSON in this format:
{
  "annotations": [
    { "item": "Caesar Salad", "type": "initials", "value": "JN", "location": "next to item" },
    { "item": null, "type": "initials", "value": "JN", "location": "top right corner" },
    { "item": "Pizza", "type": "circle" },
    { "item": "Dessert", "type": "strikethrough" }
  ],
  "notes": "Any additional observations about the handwriting"
}

Important:
- Do NOT skip any handwritten marks. Report every single one.
- If initials appear in the margins with no specific item, set "item" to null and describe the location.
- If a circle or mark spans multiple items, create a separate annotation for each item it covers.
- If there are no handwritten annotations, return { "annotations": [], "notes": "No handwriting detected" }.
