import { describe, it, expect } from 'vitest'
import { extractDocumentFields } from './extract-document-fields.js'

const sampleFields = { TransactionDate: { content: '07.11.2025' } }

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
