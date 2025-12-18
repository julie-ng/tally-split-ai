import { describe, it, expect } from 'vitest';
import { extractReceiptDate, extractReceiptTotal, extractHashtags, extractHashtagsForAzureBlobs } from './filename.helper.js';

describe('extractReceiptDate()', () => {
  it('should extract date in YYYY-MM-DD format from the beginning of filename', () => {
    expect(extractReceiptDate('2025-12-08-grocery-store.jpg')).toBe('2025-12-08');
    expect(extractReceiptDate('2024-01-15-restaurant.png')).toBe('2024-01-15');
    expect(extractReceiptDate('2023-06-30-coffee-shop-(5.50).jpg')).toBe('2023-06-30');
  });

  it('should return null if no date is found', () => {
    expect(extractReceiptDate('grocery-store.jpg')).toBeNull();
    expect(extractReceiptDate('receipt.png')).toBeNull();
  });

  it('should return null if date is not at the beginning', () => {
    expect(extractReceiptDate('receipt-2025-12-08.jpg')).toBeNull();
    expect(extractReceiptDate('grocery-2024-01-15-store.jpg')).toBeNull();
  });

  it('should handle dates with additional content after', () => {
    expect(extractReceiptDate('2025-12-08-store-(100)#special#initials.jpg')).toBe('2025-12-08');
  });
});

describe('extractReceiptTotal()', () => {
  it('should extract receipt total in parentheses', () => {
    expect(extractReceiptTotal('2025-12-08-store-(21.82).jpg')).toBe('21.82');
    expect(extractReceiptTotal('receipt-(115).png')).toBe('115');
    expect(extractReceiptTotal('grocery-(5.50).jpg')).toBe('5.50');
  });

  it('should return null if no total is found', () => {
    expect(extractReceiptTotal('2025-12-08-store.jpg')).toBeNull();
    expect(extractReceiptTotal('receipt.png')).toBeNull();
  });

  it('should extract first occurrence if multiple parentheses exist', () => {
    expect(extractReceiptTotal('receipt-(10.50)-(20.00).jpg')).toBe('10.50');
  });

  it('should handle totals with hashtags', () => {
    expect(extractReceiptTotal('2025-12-08-store-(21.82)#special.jpg')).toBe('21.82');
  });

  it('should handle whole numbers', () => {
    expect(extractReceiptTotal('receipt-(100).jpg')).toBe('100');
    expect(extractReceiptTotal('store-(50).png')).toBe('50');
  });
});

describe('extractHashtags()', () => {
  it('should extract single hashtag', () => {
    expect(extractHashtags('receipt#special.jpg')).toEqual(['special']);
    expect(extractHashtags('2025-12-08-store#initials.png')).toEqual(['initials']);
  });

  it('should extract multiple hashtags and join with plus sign', () => {
    expect(extractHashtags('receipt#special#initials.jpg')).toEqual(['special', 'initials']);
    expect(extractHashtags('store#tag1#tag2#tag3.png')).toEqual(['tag1', 'tag2', 'tag3']);
  });

  it('should return null if no hashtags are found', () => {
    expect(extractHashtags('2025-12-08-store.jpg')).toEqual([]);
    expect(extractHashtags('receipt-(21.82).png')).toEqual([]);
  });

  it('should handle hashtags with numbers', () => {
    expect(extractHashtags('receipt#tag123.jpg')).toEqual(['tag123']);
    expect(extractHashtags('store#item1#item2.png')).toEqual(['item1', 'item2']);
  });

  it('should handle hashtags with hyphens and underscores', () => {
    expect(extractHashtags('receipt#multi-word.jpg')).toEqual(['multi-word']);
    expect(extractHashtags('store#with_underscore.png')).toEqual(['with_underscore']);
    expect(extractHashtags('file#tag-1#tag_2.jpg')).toEqual(['tag-1', 'tag_2']);
  });

  it('should extract hashtags combined with date and total', () => {
    expect(extractHashtags('2025-12-08-store-(21.82)#special#initials.jpg')).toEqual(['special', 'initials']);
  });
});

describe('extractHashtagsForAzureBlobs()', () => {
  it('should extract single hashtag', () => {
    expect(extractHashtagsForAzureBlobs('receipt#special.jpg')).toBe('special');
    expect(extractHashtagsForAzureBlobs('2025-12-08-store#initials.png')).toBe('initials');
  });

  it('should extract multiple hashtags and join with plus sign', () => {
    expect(extractHashtagsForAzureBlobs('receipt#special#initials.jpg')).toBe('special+initials');
    expect(extractHashtagsForAzureBlobs('store#tag1#tag2#tag3.png')).toBe('tag1+tag2+tag3');
  });

  it('should return null if no hashtags are found', () => {
    expect(extractHashtagsForAzureBlobs('2025-12-08-store.jpg')).toBeNull();
    expect(extractHashtagsForAzureBlobs('receipt-(21.82).png')).toBeNull();
  });

  it('should handle hashtags with numbers', () => {
    expect(extractHashtagsForAzureBlobs('receipt#tag123.jpg')).toBe('tag123');
    expect(extractHashtagsForAzureBlobs('store#item1#item2.png')).toBe('item1+item2');
  });

  it('should handle hashtags with hyphens and underscores', () => {
    expect(extractHashtagsForAzureBlobs('receipt#multi-word.jpg')).toBe('multi-word');
    expect(extractHashtagsForAzureBlobs('store#with_underscore.png')).toBe('with_underscore');
    expect(extractHashtagsForAzureBlobs('file#tag-1#tag_2.jpg')).toBe('tag-1+tag_2');
  });

  it('should extract hashtags combined with date and total', () => {
    expect(extractHashtagsForAzureBlobs('2025-12-08-store-(21.82)#special#initials.jpg')).toBe('special+initials');
  });
});
