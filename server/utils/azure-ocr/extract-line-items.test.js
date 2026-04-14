import { describe, it, expect } from 'vitest'
import { extractLineItems } from './extract-line-items.js'

describe('extractLineItems', () => {
  it('should extract line items with description, quantity, totalPrice', () => {
    const fields = {
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
    expect(extractLineItems(fields)).toEqual([
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
