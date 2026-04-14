import { describe, it, expect } from 'vitest'
import { extractForLlm } from './extract-for-llm.js'

const sampleOcrJson = {
  analyzeResult: {
    documents: [{
      fields: {
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
        Total: { valueCurrency: { amount: 41.95, currencyCode: 'EUR' }, content: '41,95' },
        Subtotal: { valueCurrency: { amount: 39.00 } },
        TotalTax: { valueCurrency: { amount: 2.95 } },
        Tip: { valueCurrency: { amount: 3.00 } },
        MerchantName: { content: 'Rewe' },
        TransactionDate: { content: '07.11.2025' },
      },
    }],
  },
}

describe('extractForLlm', () => {
  it('should return flattened line items and totals', () => {
    const result = extractForLlm(sampleOcrJson)
    expect(result).toEqual({
      lineItems: [
        { description: 'Brötchen', quantity: 2, totalPrice: 1.60 },
        { description: 'Milch', quantity: 1, totalPrice: 1.29 },
      ],
      total: 41.95,
      subtotal: 39.00,
      tax: 2.95,
      tip: 3.00,
    })
  })

  it('should not include merchant, date, or other non-financial fields', () => {
    const result = extractForLlm(sampleOcrJson)
    expect(result.MerchantName).toBeUndefined()
    expect(result.TransactionDate).toBeUndefined()
  })

  it('should return null for missing analyzeResult', () => {
    expect(extractForLlm({})).toBeNull()
    expect(extractForLlm(null)).toBeNull()
    expect(extractForLlm(undefined)).toBeNull()
  })

  it('should return null for empty documents array', () => {
    expect(extractForLlm({ analyzeResult: { documents: [] } })).toBeNull()
  })

  it('should handle missing optional fields', () => {
    const minimal = {
      analyzeResult: {
        documents: [{
          fields: {
            Total: { valueCurrency: { amount: 10.00 } },
          },
        }],
      },
    }
    const result = extractForLlm(minimal)
    expect(result).toEqual({
      lineItems: [],
      total: 10.00,
      subtotal: null,
      tax: null,
      tip: null,
    })
  })

  it('should prefer TotalTax over Tax', () => {
    const withBoth = {
      analyzeResult: {
        documents: [{
          fields: {
            TotalTax: { valueCurrency: { amount: 5.00 } },
            Tax: { valueCurrency: { amount: 3.00 } },
          },
        }],
      },
    }
    expect(extractForLlm(withBoth).tax).toBe(5.00)
  })

  it('should fall back to Tax when TotalTax is missing', () => {
    const taxOnly = {
      analyzeResult: {
        documents: [{
          fields: {
            Tax: { valueCurrency: { amount: 3.00 } },
          },
        }],
      },
    }
    expect(extractForLlm(taxOnly).tax).toBe(3.00)
  })
})
