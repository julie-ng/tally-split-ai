import { extractDocumentFields } from './extract-document-fields.js'
import { extractFlattenedLineItems } from './extract-flattened-line-items.js'

/**
 * Extract a condensed, flattened representation of OCR data for LLM consumption.
 * Composes existing extractors to produce a minimal payload (~86% smaller than full OCR JSON).
 *
 * @param {Object} ocrJson - Full Azure DI response body
 * @returns {Object|null} Flattened object with lineItems and totals, or null if no document fields
 */
export function extractForLlm (ocrJson) {
  const fields = extractDocumentFields(ocrJson)
  if (!fields) return null

  return {
    lineItems: extractFlattenedLineItems(fields),
    total: fields.Total?.valueCurrency?.amount ?? null,
    subtotal: fields.Subtotal?.valueCurrency?.amount ?? null,
    tax: fields.TotalTax?.valueCurrency?.amount ?? fields.Tax?.valueCurrency?.amount ?? null,
    tip: fields.Tip?.valueCurrency?.amount ?? null,
  }
}
