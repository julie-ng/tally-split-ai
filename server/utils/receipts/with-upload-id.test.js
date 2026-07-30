import { describe, it, expect } from 'vitest'
import { receiptWithUploadId } from './with-upload-id.js'

const receipt = () => ({
  id: 'rec_1',
  title: 'Rewe',
  upload: { id: 'upl_1', originalFilename: 'scan.jpg' },
})

describe('receiptWithUploadId', () => {
  it('should flatten upload to a scalar uploadId', () => {
    expect(receiptWithUploadId(receipt())).toEqual({
      id: 'rec_1',
      title: 'Rewe',
      uploadId: 'upl_1',
    })
  })

  it('should drop the embedded upload by default', () => {
    expect(receiptWithUploadId(receipt())).not.toHaveProperty('upload')
  })

  it('should keep the embedded upload when asked', () => {
    const result = receiptWithUploadId(receipt(), { keepUpload: true })
    expect(result.upload).toEqual({ id: 'upl_1', originalFilename: 'scan.jpg' })
    expect(result.uploadId).toBe('upl_1')
  })

  // Pre-OCR: the upload exists but has no receiptId yet, so from the receipt's
  // side there is no upload at all.
  it('should return null uploadId when the relation is absent', () => {
    expect(receiptWithUploadId({ id: 'rec_1' }).uploadId).toBeNull()
  })

  it('should return null uploadId when the relation is null', () => {
    expect(receiptWithUploadId({ id: 'rec_1', upload: null }).uploadId).toBeNull()
  })

  it('should keep a null upload when keepUpload is set', () => {
    const result = receiptWithUploadId({ id: 'rec_1', upload: null }, { keepUpload: true })
    expect(result.upload).toBeNull()
    expect(result.uploadId).toBeNull()
  })

  it('should pass through null and undefined receipts', () => {
    expect(receiptWithUploadId(null)).toBeNull()
    expect(receiptWithUploadId(undefined)).toBeUndefined()
  })
})
