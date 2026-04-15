import { describe, it, expect } from 'vitest'
import { slimOcrResponse } from './slim-ocr-response.js'

const sampleBody = {
  status: 'succeeded',
  createdDateTime: '2026-04-10T12:00:00Z',
  lastUpdatedDateTime: '2026-04-10T12:00:05Z',
  analyzeResult: {
    apiVersion: '2024-11-30',
    modelId: 'prebuilt-receipt',
    contentFormat: 'text',
    stringIndexType: 'utf16CodeUnit',
    content: 'Full OCR text that is redundant with ocrText column...',
    pages: [
      {
        pageNumber: 1,
        width: 1027,
        height: 3531,
        unit: 'pixel',
        angle: 0.1,
        lines: [
          { content: 'Line 1', polygon: [1, 2, 3, 4], spans: [{ offset: 0, length: 6 }] },
          { content: 'Line 2', polygon: [5, 6, 7, 8], spans: [{ offset: 7, length: 6 }] },
        ],
        words: [
          { content: 'Word1', polygon: [1, 2, 3, 4, 5, 6, 7, 8], confidence: 0.99, span: { offset: 0, length: 5 } },
          { content: 'Word2', polygon: [9, 10, 11, 12, 13, 14, 15, 16], confidence: 0.98, span: { offset: 6, length: 5 } },
        ],
        spans: [{ offset: 0, length: 100 }],
      },
    ],
    styles: [
      { isHandwritten: true, confidence: 0.85, spans: [{ offset: 50, length: 2 }] },
    ],
    documents: [
      {
        docType: 'receipt.retailMeal',
        fields: {
          MerchantName: { content: 'Rewe', confidence: 0.98, boundingRegions: [{ pageNumber: 1, polygon: [1, 2, 3, 4] }] },
          Total: { valueCurrency: { amount: 42.05 }, confidence: 0.99, boundingRegions: [{ pageNumber: 1, polygon: [5, 6, 7, 8] }] },
        },
        confidence: 0.95,
        boundingRegions: [{ pageNumber: 1, polygon: [0, 0, 1027, 0, 1027, 3531, 0, 3531] }],
      },
    ],
  },
}

describe('slimOcrResponse', () => {
  it('should preserve metadata fields', () => {
    const result = slimOcrResponse(sampleBody)
    expect(result.status).toBe('succeeded')
    expect(result.createdDateTime).toBe('2026-04-10T12:00:00Z')
    expect(result.lastUpdatedDateTime).toBe('2026-04-10T12:00:05Z')
  })

  it('should preserve analyzeResult metadata', () => {
    const result = slimOcrResponse(sampleBody)
    expect(result.analyzeResult.apiVersion).toBe('2024-11-30')
    expect(result.analyzeResult.modelId).toBe('prebuilt-receipt')
  })

  it('should preserve page dimensions but drop words and lines', () => {
    const result = slimOcrResponse(sampleBody)
    const page = result.analyzeResult.pages[0]
    expect(page.pageNumber).toBe(1)
    expect(page.width).toBe(1027)
    expect(page.height).toBe(3531)
    expect(page.unit).toBe('pixel')
    expect(page.angle).toBe(0.1)
    expect(page.words).toBeUndefined()
    expect(page.lines).toBeUndefined()
    expect(page.spans).toBeUndefined()
  })

  it('should preserve styles (handwriting detection)', () => {
    const result = slimOcrResponse(sampleBody)
    expect(result.analyzeResult.styles).toEqual(sampleBody.analyzeResult.styles)
  })

  it('should preserve documents with fields and boundingRegions', () => {
    const result = slimOcrResponse(sampleBody)
    const doc = result.analyzeResult.documents[0]
    expect(doc.fields.MerchantName.content).toBe('Rewe')
    expect(doc.fields.MerchantName.boundingRegions).toBeDefined()
    expect(doc.fields.Total.valueCurrency.amount).toBe(42.05)
  })

  it('should drop analyzeResult.content', () => {
    const result = slimOcrResponse(sampleBody)
    expect(result.analyzeResult.content).toBeUndefined()
  })

  it('should drop contentFormat and stringIndexType', () => {
    const result = slimOcrResponse(sampleBody)
    expect(result.analyzeResult.contentFormat).toBeUndefined()
    expect(result.analyzeResult.stringIndexType).toBeUndefined()
  })

  it('should return null/undefined input as-is', () => {
    expect(slimOcrResponse(null)).toBeNull()
    expect(slimOcrResponse(undefined)).toBeUndefined()
  })

  it('should handle body without analyzeResult gracefully', () => {
    const body = { status: 'running' }
    expect(slimOcrResponse(body)).toEqual(body)
  })

  it('should produce a smaller output than input', () => {
    const beforeSize = JSON.stringify(sampleBody).length
    const afterSize = JSON.stringify(slimOcrResponse(sampleBody)).length
    expect(afterSize).toBeLessThan(beforeSize)
  })
})
