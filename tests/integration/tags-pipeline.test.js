import { describe, it, expect } from 'vitest'
import { extractHashtags, extractHashtagsForAzureBlobs } from '../../shared/utils/filename.utils.js'
import { azureUtils } from '../../shared/utils/azure.utils.js'
import { receiptUtils } from '../../shared/utils/receipt.utils.js'

/**
 * Tags Pipeline Tests
 *
 * Tests the full data transformation chain for tags:
 *
 *   filename (#special #initals)
 *     → extractHashtagsForAzureBlobs()        → "special+initals"
 *     → azureTags object                       → { "receipt-tags": "special+initals" }
 *     → uploads.azure_tags (jsonb)             → stored as native JSON
 *     → receiptUtils.azureTagsToReceiptTags()  → "special, initals"
 *     → receipts.tags (text)                   → comma-separated string
 *     → receiptUtils.receiptTagsToDisplayArray() → ['special', 'initals'] as badges
 *
 * These tests verify that format transformations between layers are
 * consistent, catching the class of bugs found during the SQLite→Postgres
 * migration (see memory: feedback_migration_blind_spots.md).
 */

describe('Tags Pipeline: filename → azureTags → receipt tags → UI', () => {
  const filename = '2025-11-17 Cold Medicine (18.25) #special #initals.jpg'

  describe('Step 1: filename → hashtag array', () => {
    it('should extract hashtags from filename', () => {
      const tags = extractHashtags(filename)
      expect(tags).toEqual(['special', 'initals'])
    })
  })

  describe('Step 2: filename → Azure blob tag string', () => {
    it('should produce plus-separated string for Azure', () => {
      const blobTags = extractHashtagsForAzureBlobs(filename)
      expect(blobTags).toBe('special+initals')
    })
  })

  describe('Step 3: Azure blob tag string → azureTags object', () => {
    it('should store as receipt-tags key in azureTags object', () => {
      const blobTags = extractHashtagsForAzureBlobs(filename)
      const azureTags = { 'receipt-tags': blobTags }
      expect(azureTags).toEqual({ 'receipt-tags': 'special+initals' })
    })
  })

  describe('Step 4: azureTags (jsonb) → receipt tags (comma-separated)', () => {
    it('should convert plus-separated to comma-separated', () => {
      const azureTags = { 'receipt-tags': 'special+initals' }
      const receiptTags = receiptUtils.azureTagsToReceiptTags(azureTags)
      expect(receiptTags).toBe('special, initals')
    })
  })

  describe('Step 5: receipt tags → UI display array', () => {
    it('should split and trim for badge display', () => {
      const displayTags = receiptUtils.receiptTagsToDisplayArray('special, initals')
      expect(displayTags).toEqual(['special', 'initals'])
    })
  })

  describe('Full pipeline: filename → display', () => {
    it('should produce correct display tags from filename', () => {
      const blobTagString = extractHashtagsForAzureBlobs(filename)
      const azureTags = { 'receipt-tags': blobTagString }
      const receiptTags = receiptUtils.azureTagsToReceiptTags(azureTags)
      const displayTags = receiptUtils.receiptTagsToDisplayArray(receiptTags)

      expect(displayTags).toEqual(['special', 'initals'])
    })

    it('should match original hashtags from filename', () => {
      const original = extractHashtags(filename)
      const blobTagString = extractHashtagsForAzureBlobs(filename)
      const azureTags = { 'receipt-tags': blobTagString }
      const receiptTags = receiptUtils.azureTagsToReceiptTags(azureTags)
      const displayed = receiptUtils.receiptTagsToDisplayArray(receiptTags)

      expect(displayed).toEqual(original)
    })
  })

  describe('azureTags utilities with jsonb objects', () => {
    it('excludeInternalBlobTags should preserve receipt-tags in object form', () => {
      const azureTags = {
        'user-id': 'julie-ng',
        'receipt-tags': 'special+initals',
        'receipt-total': '18.25',
      }
      const filtered = azureUtils.excludeInternalBlobTags(azureTags)
      expect(filtered).toEqual({
        'receipt-tags': 'special+initals',
        'receipt-total': '18.25',
      })
    })

    it('getReceiptTotalBlobTag should work with jsonb object', () => {
      const azureTags = {
        'receipt-tags': 'special+initals',
        'receipt-total': '18.25',
      }
      const total = azureUtils.getReceiptTotalBlobTag(azureTags)
      expect(total).toBe('18.25')
    })
  })

  describe('Edge cases', () => {
    it('should handle single tag', () => {
      const f = '2025-01-01 Test (10) #groceries.jpg'
      const blobTags = extractHashtagsForAzureBlobs(f)
      expect(blobTags).toBe('groceries')

      const receiptTags = receiptUtils.azureTagsToReceiptTags({ 'receipt-tags': blobTags })
      expect(receiptTags).toBe('groceries')

      const display = receiptUtils.receiptTagsToDisplayArray(receiptTags)
      expect(display).toEqual(['groceries'])
    })

    it('should handle no tags', () => {
      const f = '2025-01-01 Test (10).jpg'
      const blobTags = extractHashtagsForAzureBlobs(f)
      expect(blobTags).toBeNull()

      const receiptTags = receiptUtils.azureTagsToReceiptTags({ 'receipt-tags': blobTags })
      expect(receiptTags).toBeNull()

      const display = receiptUtils.receiptTagsToDisplayArray(receiptTags)
      expect(display).toEqual([])
    })

    it('should handle three tags', () => {
      const f = '2025-01-01 Test (10) #food #shared #tip.jpg'
      const blobTags = extractHashtagsForAzureBlobs(f)
      expect(blobTags).toBe('food+shared+tip')

      const receiptTags = receiptUtils.azureTagsToReceiptTags({ 'receipt-tags': blobTags })
      expect(receiptTags).toBe('food, shared, tip')

      const display = receiptUtils.receiptTagsToDisplayArray(receiptTags)
      expect(display).toEqual(['food', 'shared', 'tip'])
    })

    it('should handle tags with hyphens', () => {
      const f = '2025-01-01 Test (10) #my-tag #another-one.jpg'
      const blobTags = extractHashtagsForAzureBlobs(f)
      expect(blobTags).toBe('my-tag+another-one')

      const receiptTags = receiptUtils.azureTagsToReceiptTags({ 'receipt-tags': blobTags })
      expect(receiptTags).toBe('my-tag, another-one')

      const display = receiptUtils.receiptTagsToDisplayArray(receiptTags)
      expect(display).toEqual(['my-tag', 'another-one'])
    })

    it('should handle null azureTags gracefully', () => {
      const receiptTags = receiptUtils.azureTagsToReceiptTags(null)
      expect(receiptTags).toBeNull()
    })

    it('should handle azureTags without receipt-tags key', () => {
      const receiptTags = receiptUtils.azureTagsToReceiptTags({ 'user-id': 'julie-ng' })
      expect(receiptTags).toBeNull()
    })
  })
})
