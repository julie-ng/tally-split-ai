import { describe, it, expect } from 'vitest'
import { AZReceiptModelUtils } from './azure-receipt-model.utils.js'

describe('AZReceiptModelUtils.formatCurrency', () => {
  it('should format currency with symbol and amount', () => {
    const result = AZReceiptModelUtils.formatCurrency({
      currencySymbol: '€',
      valueAmount: 23.40,
    })
    expect(result).toBe('€ 23.4')
  })

  it('should handle dollar symbol', () => {
    const result = AZReceiptModelUtils.formatCurrency({
      currencySymbol: '$',
      valueAmount: 100.00,
    })
    expect(result).toBe('$ 100')
  })
})

describe('AZReceiptModelUtils.sortFields', () => {
  it('should sort MerchantName into merchant.name', () => {
    const fields = [
      { field: 'MerchantName', content: 'dm-drogerie markt', confidence: 0.95 },
    ]
    const result = AZReceiptModelUtils.sortFields(fields)
    expect(result.merchant.name).toEqual({
      value: 'dm-drogerie markt',
      confidence: 0.95,
    })
  })

  it('should sort MerchantPhoneNumber into merchant.phone', () => {
    const fields = [
      { field: 'MerchantPhoneNumber', valuePhoneNumber: '+4989123456', confidence: 0.9 },
    ]
    const result = AZReceiptModelUtils.sortFields(fields)
    expect(result.merchant.phone).toEqual({
      value: '+4989123456',
      confidence: 0.9,
    })
  })

  it('should sort MerchantAddress into merchant.address with formatted value', () => {
    const fields = [
      {
        field: 'MerchantAddress',
        valueAddress: { road: 'Rosenheimer Str.', houseNumber: '21', postalCode: '83607', city: 'Holzkirchen' },
        confidence: 0.85,
      },
    ]
    const result = AZReceiptModelUtils.sortFields(fields)
    expect(result.merchant.address.formattedValue).toBe('Rosenheimer Str. 21, 83607 Holzkirchen')
    expect(result.merchant.address.confidence).toBe(0.85)
  })

  it('should sort Total into receipt.total with formatted value', () => {
    const fields = [
      {
        field: 'Total',
        valueCurrency: { currencySymbol: '€', valueAmount: 23.40 },
        confidence: 0.99,
      },
    ]
    const result = AZReceiptModelUtils.sortFields(fields)
    expect(result.receipt.total.formattedValue).toBe('€ 23.4')
    expect(result.receipt.total.confidence).toBe(0.99)
  })

  it('should sort TransactionDate into receipt.transactionDate', () => {
    const fields = [
      { field: 'TransactionDate', valueDate: '2025-11-18', confidence: 0.98 },
    ]
    const result = AZReceiptModelUtils.sortFields(fields)
    expect(result.receipt.transactionDate).toEqual({
      value: '2025-11-18',
      confidence: 0.98,
    })
  })

  it('should sort TransactionTime into receipt.transactionTime', () => {
    const fields = [
      { field: 'TransactionTime', valueTime: '17:44', confidence: 0.97 },
    ]
    const result = AZReceiptModelUtils.sortFields(fields)
    expect(result.receipt.transactionTime).toEqual({
      value: '17:44',
      confidence: 0.97,
    })
  })

  it('should sort ReceiptType into receipt.type', () => {
    const fields = [
      { field: 'ReceiptType', valueString: 'Itemized', confidence: 0.99 },
    ]
    const result = AZReceiptModelUtils.sortFields(fields)
    expect(result.receipt.type).toEqual({
      value: 'Itemized',
      confidence: 0.99,
    })
  })

  it('should sort CountryRegion into receipt.countryRegion', () => {
    const fields = [
      { field: 'CountryRegion', valueCountryRegion: 'DE', confidence: 0.95 },
    ]
    const result = AZReceiptModelUtils.sortFields(fields)
    expect(result.receipt.countryRegion).toEqual({
      value: 'DE',
      confidence: 0.95,
    })
  })

  it('should return empty objects when no fields match', () => {
    const result = AZReceiptModelUtils.sortFields([])
    expect(result.merchant).toEqual({})
    expect(result.receipt).toEqual({})
    expect(result.items).toEqual([])
  })

  it('should handle multiple fields together', () => {
    const fields = [
      { field: 'MerchantName', content: 'dm-drogerie markt', confidence: 0.95 },
      { field: 'Total', valueCurrency: { currencySymbol: '€', valueAmount: 23.40 }, confidence: 0.99 },
      { field: 'TransactionDate', valueDate: '2025-11-18', confidence: 0.98 },
    ]
    const result = AZReceiptModelUtils.sortFields(fields)
    expect(result.merchant.name.value).toBe('dm-drogerie markt')
    expect(result.receipt.total.formattedValue).toBe('€ 23.4')
    expect(result.receipt.transactionDate.value).toBe('2025-11-18')
  })
})

describe('AZReceiptModelUtils.sortItems', () => {
  it('should return empty items for null input', () => {
    const result = AZReceiptModelUtils.sortItems(null)
    expect(result.items).toEqual([])
  })

  it('should return empty items for undefined input', () => {
    const result = AZReceiptModelUtils.sortItems(undefined)
    expect(result.items).toEqual([])
  })

  it('should parse item with description and total price', () => {
    const items = [{
      valueObject: {
        confidence: 0.9,
        Description: { valueString: 'Toilet Paper', confidence: 0.95 },
        TotalPrice: { valueCurrency: { amount: 7.75 }, confidence: 0.98 },
      },
    }]
    const result = AZReceiptModelUtils.sortItems(items)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].description.value).toBe('Toilet Paper')
    expect(result.items[0].totalPrice.value).toBe(7.75)
    expect(result.subtotal).toBe(7.75)
    expect(result.hasQuantity).toBe(false)
  })

  it('should set hasQuantity when items have Quantity', () => {
    const items = [{
      valueObject: {
        confidence: 0.9,
        Quantity: { valueNumber: 2, confidence: 0.95 },
        Description: { valueString: 'Milk', confidence: 0.95 },
        TotalPrice: { valueCurrency: { amount: 3.50 }, confidence: 0.98 },
      },
    }]
    const result = AZReceiptModelUtils.sortItems(items)
    expect(result.hasQuantity).toBe(true)
    expect(result.items[0].quantity.value).toBe(2)
  })

  it('should calculate subtotal across multiple items', () => {
    const items = [
      {
        valueObject: {
          confidence: 0.9,
          Description: { valueString: 'Item A', confidence: 0.95 },
          TotalPrice: { valueCurrency: { amount: 10.50 }, confidence: 0.98 },
        },
      },
      {
        valueObject: {
          confidence: 0.9,
          Description: { valueString: 'Item B', confidence: 0.95 },
          TotalPrice: { valueCurrency: { amount: 5.25 }, confidence: 0.98 },
        },
      },
    ]
    const result = AZReceiptModelUtils.sortItems(items)
    expect(result.subtotal).toBe(15.75)
    expect(result.items).toHaveLength(2)
  })

  it('should round subtotal to 2 decimal places', () => {
    const items = [
      {
        valueObject: {
          confidence: 0.9,
          TotalPrice: { valueCurrency: { amount: 1.1 }, confidence: 0.98 },
        },
      },
      {
        valueObject: {
          confidence: 0.9,
          TotalPrice: { valueCurrency: { amount: 2.2 }, confidence: 0.98 },
        },
      },
    ]
    const result = AZReceiptModelUtils.sortItems(items)
    expect(result.subtotal).toBe(3.3)
  })
})
