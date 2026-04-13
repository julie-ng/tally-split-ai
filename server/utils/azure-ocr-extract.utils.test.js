import { describe, it, expect } from 'vitest'
import { azureOcrExtract } from './azure-ocr-extract.utils.js'

const {
  extractDocumentFields,
  extractTransactionDate,
  extractTransactionTime,
  extractLineItems,
} = azureOcrExtract

const sampleFields = {
  TransactionDate: {
    content: '07.11.2025',
    valueDate: '2025-11-07',
  },
  TransactionTime: {
    content: '17:45 Uhr',
    valueTime: '17:45:00',
  },
  Items: {
    valueArray: [
      {
        valueObject: {
          Description: { content: 'Brötchen' },
          Quantity: { valueNumber: 2 },
          TotalPrice: { valueCurrency: { amount: 1.60 } },
        },
      },
      {
        valueObject: {
          Description: { content: 'Milch' },
          Quantity: { valueNumber: 1 },
          TotalPrice: { valueCurrency: { amount: 1.29 } },
        },
      },
    ],
  },
}

describe('extractDocumentFields', () => {
  it('should extract fields from a valid Azure DI response', () => {
    const ocrJson = { analyzeResult: { documents: [{ fields: sampleFields }] } }
    expect(extractDocumentFields(ocrJson)).toBe(sampleFields)
  })

  it('should return null for missing analyzeResult', () => {
    expect(extractDocumentFields({})).toBeNull()
    expect(extractDocumentFields(null)).toBeNull()
    expect(extractDocumentFields(undefined)).toBeNull()
  })

  it('should return null for empty documents array', () => {
    expect(extractDocumentFields({ analyzeResult: { documents: [] } })).toBeNull()
  })
})

describe('extractTransactionDate', () => {
  it('should extract content and valueDate', () => {
    expect(extractTransactionDate(sampleFields)).toEqual({
      content: '07.11.2025',
      valueDate: '2025-11-07',
    })
  })

  it('should return null if TransactionDate is missing', () => {
    expect(extractTransactionDate({})).toBeNull()
    expect(extractTransactionDate(null)).toBeNull()
  })

  it('should handle missing sub-fields gracefully', () => {
    expect(extractTransactionDate({ TransactionDate: {} })).toEqual({
      content: null,
      valueDate: null,
    })
  })
})

describe('extractTransactionTime', () => {
  it('should extract content and valueTime', () => {
    expect(extractTransactionTime(sampleFields)).toEqual({
      content: '17:45 Uhr',
      valueTime: '17:45:00',
    })
  })

  it('should return null if TransactionTime is missing', () => {
    expect(extractTransactionTime({})).toBeNull()
    expect(extractTransactionTime(null)).toBeNull()
  })

  it('should handle missing sub-fields gracefully', () => {
    expect(extractTransactionTime({ TransactionTime: {} })).toEqual({
      content: null,
      valueTime: null,
    })
  })
})

describe('extractLineItems', () => {
  it('should extract line items with description, quantity, totalPrice', () => {
    const items = extractLineItems(sampleFields)
    expect(items).toEqual([
      { description: 'Brötchen', quantity: 2, totalPrice: 1.60 },
      { description: 'Milch', quantity: 1, totalPrice: 1.29 },
    ])
  })

  it('should return empty array if Items is missing', () => {
    expect(extractLineItems({})).toEqual([])
    expect(extractLineItems(null)).toEqual([])
  })

  it('should handle items with missing sub-fields', () => {
    const fields = {
      Items: {
        valueArray: [
          { valueObject: { Description: { content: 'Something' } } },
          { valueObject: {} },
        ],
      },
    }
    expect(extractLineItems(fields)).toEqual([
      { description: 'Something', quantity: null, totalPrice: null },
      { description: null, quantity: null, totalPrice: null },
    ])
  })
})
