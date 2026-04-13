/**
 * Extraction utilities for Azure Document Intelligence OCR responses.
 * Decouples the Azure-specific response structure from downstream consumers.
 *
 * Import paths:
 * - From server/: auto-imported via Nuxt
 * - From trigger/: import { azureOcrExtract } from '../server/utils/azure-ocr-extract.utils.js'
 */

/**
 * Extract the document fields object from an Azure Document Intelligence response.
 * @param {Object} ocrJson - Full Azure DI response body
 * @returns {Object|null} Fields object or null if not found
 */
function extractDocumentFields (ocrJson) {
  return ocrJson?.analyzeResult?.documents?.[0]?.fields || null
}

/**
 * Extract transaction date from Azure DI fields.
 * @param {Object} fields - Document fields from extractDocumentFields()
 * @returns {{ content: string, valueDate: string }|null}
 */
function extractTransactionDate (fields) {
  if (!fields?.TransactionDate) return null
  return {
    content: fields.TransactionDate.content || null,
    valueDate: fields.TransactionDate.valueDate || null,
  }
}

/**
 * Extract transaction time from Azure DI fields.
 * @param {Object} fields - Document fields from extractDocumentFields()
 * @returns {{ content: string, valueTime: string }|null}
 */
function extractTransactionTime (fields) {
  if (!fields?.TransactionTime) return null
  return {
    content: fields.TransactionTime.content || null,
    valueTime: fields.TransactionTime.valueTime || null,
  }
}

/**
 * Extract line items from Azure DI fields.
 * @param {Object} fields - Document fields from extractDocumentFields()
 * @returns {{ description: string|null, quantity: number|null, totalPrice: number|null }[]}
 */
function extractLineItems (fields) {
  const items = fields?.Items?.valueArray || []
  return items.map(item => ({
    description: item.valueObject?.Description?.content || null,
    quantity: item.valueObject?.Quantity?.valueNumber || null,
    totalPrice: item.valueObject?.TotalPrice?.valueCurrency?.amount || null,
  }))
}

export const azureOcrExtract = {
  extractDocumentFields,
  extractTransactionDate,
  extractTransactionTime,
  extractLineItems,
}
