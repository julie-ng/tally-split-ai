import { describe, it, expect } from 'vitest';
import { extractReceiptDate, extractReceiptTotal, extractHashtags, extractHashtagsForAzureBlobs, extractReceiptTitle, filenameToComponentKey, simpleHash, createAzureFilename, createThumbnailFilename } from './filename.utils.js';

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

describe('extractReceiptTitle()', () => {
  it('should extract title from filename with all metadata', () => {
    expect(extractReceiptTitle('2025-12-08 Grocery Store (45.99) #food #mm.jpg')).toBe('Grocery Store');
    expect(extractReceiptTitle('2024-01-15 Restaurant Bill (125.50) #dining #special.png')).toBe('Restaurant Bill');
  });

  it('should handle filename with only date', () => {
    expect(extractReceiptTitle('2025-12-08 Coffee Shop.jpg')).toBe('Coffee Shop');
    expect(extractReceiptTitle('2024-01-15 Store.png')).toBe('Store');
  });

  it('should handle filename with date and price', () => {
    expect(extractReceiptTitle('2025-12-08 Market (50.00).jpg')).toBe('Market');
    expect(extractReceiptTitle('2024-01-15 Shop (10.50).png')).toBe('Shop');
  });

  it('should handle filename with date and hashtags', () => {
    expect(extractReceiptTitle('2025-12-08 Store #special #initials.jpg')).toBe('Store');
    expect(extractReceiptTitle('2024-01-15 Restaurant #food.png')).toBe('Restaurant');
  });

  it('should remove file extension', () => {
    expect(extractReceiptTitle('Store.jpg')).toBe('Store');
    expect(extractReceiptTitle('Restaurant.png')).toBe('Restaurant');
    expect(extractReceiptTitle('Receipt.jpeg')).toBe('Receipt');
  });

  it('should handle filename without date', () => {
    expect(extractReceiptTitle('Grocery Store (45.99) #food.jpg')).toBe('Grocery Store');
    expect(extractReceiptTitle('Coffee Shop #special.png')).toBe('Coffee Shop');
  });

  it('should normalize whitespace', () => {
    expect(extractReceiptTitle('2025-12-08   Multiple   Spaces  .jpg')).toBe('Multiple Spaces');
    expect(extractReceiptTitle('2024-01-15 Store   (10.50)   #tag.png')).toBe('Store');
  });

  it('should handle filename with only title and extension', () => {
    expect(extractReceiptTitle('Simple Receipt.jpg')).toBe('Simple Receipt');
    expect(extractReceiptTitle('Store.png')).toBe('Store');
  });

  it('should handle empty result gracefully', () => {
    expect(extractReceiptTitle('2025-12-08 (45.99) #tag.jpg')).toBe('');
  });

  it('should handle multiple hashtags', () => {
    expect(extractReceiptTitle('2025-12-08 Store #tag1 #tag2 #tag3.jpg')).toBe('Store');
  });

  it('should handle price without decimals', () => {
    expect(extractReceiptTitle('2025-12-08 Store (100).jpg')).toBe('Store');
  });
});

describe('filenameToComponentKey()', () => {
  it('should convert filename with all metadata to component key', () => {
    expect(filenameToComponentKey('2025-12-08 Store (11.50) #special #initials.jpg')).toBe('2025-12-08-store-11-50-special-initials-jpg');
    expect(filenameToComponentKey('2024-01-15 Restaurant (125.50) #food.png')).toBe('2024-01-15-restaurant-125-50-food-png');
  });

  it('should convert to lowercase', () => {
    expect(filenameToComponentKey('UPPERCASE.JPG')).toBe('uppercase-jpg');
    expect(filenameToComponentKey('MixedCase.PNG')).toBe('mixedcase-png');
  });

  it('should replace spaces with dashes', () => {
    expect(filenameToComponentKey('Grocery Store Receipt.jpg')).toBe('grocery-store-receipt-jpg');
    expect(filenameToComponentKey('Multiple   Spaces.png')).toBe('multiple-spaces-png');
  });

  it('should replace special characters with dashes', () => {
    expect(filenameToComponentKey('file@name!.jpg')).toBe('file-name-jpg');
    expect(filenameToComponentKey('receipt$123%.png')).toBe('receipt-123-png');
  });

  it('should handle parentheses and dots', () => {
    expect(filenameToComponentKey('receipt (100).jpg')).toBe('receipt-100-jpg');
    expect(filenameToComponentKey('file.name.with.dots.jpg')).toBe('file-name-with-dots-jpg');
  });

  it('should handle hashtags', () => {
    expect(filenameToComponentKey('receipt#special#initials.jpg')).toBe('receipt-special-initials-jpg');
    expect(filenameToComponentKey('file #tag1 #tag2.png')).toBe('file-tag1-tag2-png');
  });

  it('should collapse multiple dashes into one', () => {
    expect(filenameToComponentKey('file---name.jpg')).toBe('file-name-jpg');
    expect(filenameToComponentKey('receipt  (100)  #tag.png')).toBe('receipt-100-tag-png');
  });

  it('should remove leading and trailing dashes', () => {
    expect(filenameToComponentKey('-file-name-.jpg')).toBe('file-name-jpg');
    expect(filenameToComponentKey('---receipt---.png')).toBe('receipt-png');
  });

  it('should handle simple filenames', () => {
    expect(filenameToComponentKey('receipt.jpg')).toBe('receipt-jpg');
    expect(filenameToComponentKey('store.png')).toBe('store-png');
  });

  it('should handle filenames with only numbers', () => {
    expect(filenameToComponentKey('12345.jpg')).toBe('12345-jpg');
    expect(filenameToComponentKey('2025-12-08.png')).toBe('2025-12-08-png');
  });
});

describe('simpleHash()', () => {
  it('should generate an 8-character hex hash', () => {
    const hash = simpleHash('test-filename.jpg');
    expect(hash).toHaveLength(8);
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('should generate consistent hash for same input', () => {
    const input = '2025-12-08-store.jpg';
    const hash1 = simpleHash(input);
    const hash2 = simpleHash(input);
    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for different inputs', () => {
    const hash1 = simpleHash('file1.jpg');
    const hash2 = simpleHash('file2.jpg');
    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty string', () => {
    const hash = simpleHash('');
    expect(hash).toHaveLength(8);
    expect(hash).toBe('00000000');
  });

  it('should handle long filenames', () => {
    const longFilename = '2025-12-08-very-long-receipt-name-with-lots-of-metadata-(125.50)-#special-#initials-#food.jpg';
    const hash = simpleHash(longFilename);
    expect(hash).toHaveLength(8);
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('should handle special characters', () => {
    const hash = simpleHash('file@#$%^&*().jpg');
    expect(hash).toHaveLength(8);
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('createAzureFilename()', () => {
  it('should keep price and hashtag values, replace special characters with dashes, and add random suffix', () => {
    const filename = '2024-12-29 Grocery Store (45.99) #food #mm.jpg';
    const result = createAzureFilename(filename);

    expect(result).toMatch(/^2024-12-29-Grocery-Store-45\.99-food-mm-[a-f0-9]{6}\.jpg$/);
  });

  it('should preserve file extension', () => {
    const filename1 = 'Receipt.jpg';
    const filename2 = 'Receipt.png';
    const filename3 = 'Receipt.jpeg';

    expect(createAzureFilename(filename1)).toMatch(/\.jpg$/);
    expect(createAzureFilename(filename2)).toMatch(/\.png$/);
    expect(createAzureFilename(filename3)).toMatch(/\.jpeg$/);
  });

  it('should remove parentheses but keep price value', () => {
    const filename = 'Store (100.50).jpg';
    const result = createAzureFilename(filename);

    expect(result).not.toContain('(');
    expect(result).not.toContain(')');
    expect(result).toContain('100.50');
  });

  it('should remove hash symbols but keep tag values', () => {
    const filename = 'Receipt #special #initials.jpg';
    const result = createAzureFilename(filename);

    expect(result).not.toContain('#');
    expect(result).toContain('-special-');
    expect(result).toContain('-initials-');
  });

  it('should replace whitespace with dashes', () => {
    const filename = 'My Store Receipt.jpg';
    const result = createAzureFilename(filename);

    expect(result).toContain('-');
    expect(result).not.toContain(' ');
  });

  it('should clean up multiple consecutive dashes', () => {
    const filename = 'Store   Receipt.jpg';
    const result = createAzureFilename(filename);

    expect(result).not.toContain('--');
  });

  it('should remove leading and trailing dashes', () => {
    const filename = ' Receipt .jpg';
    const result = createAzureFilename(filename);

    expect(result).not.toMatch(/^-/);
    expect(result).not.toMatch(/-\./);
  });

  it('should append 6-character random suffix', () => {
    const filename = 'Receipt.jpg';
    const result = createAzureFilename(filename);

    // Check format: Receipt-[6 hex chars].jpg
    expect(result).toMatch(/^Receipt-[a-f0-9]{6}\.jpg$/);
  });

  it('should generate unique names for same filename', () => {
    const filename = 'Receipt.jpg';

    const result1 = createAzureFilename(filename);
    const result2 = createAzureFilename(filename);

    // Same input should produce different outputs due to random suffix
    expect(result1).not.toBe(result2);
  });

  it('should handle complex filenames with all metadata', () => {
    const filename = '2025-12-08 Coffee Shop (5.50) #breakfast #special.png';
    const result = createAzureFilename(filename);

    expect(result).toMatch(/^2025-12-08-Coffee-Shop-5\.50-breakfast-special-[a-f0-9]{6}\.png$/);
  });

  it('should throw error for filenames without proper image extension', () => {
    expect(() => createAzureFilename('Receipt (10.00) #test')).toThrow();
    expect(() => createAzureFilename('receipt.txt')).toThrow();
    expect(() => createAzureFilename('receipt.pdf')).toThrow();
  });
});

describe('createThumbnailFilename()', () => {
  it('should add -thumbnail suffix before extension', () => {
    expect(createThumbnailFilename('receipt.jpg')).toBe('receipt-thumbnail.jpg');
    expect(createThumbnailFilename('image.png')).toBe('image-thumbnail.png');
    expect(createThumbnailFilename('photo.jpeg')).toBe('photo-thumbnail.jpeg');
  });

  it('should handle filenames with multiple dots', () => {
    expect(createThumbnailFilename('my.receipt.jpg')).toBe('my.receipt-thumbnail.jpg');
    expect(createThumbnailFilename('file.name.with.dots.png')).toBe('file.name.with.dots-thumbnail.png');
  });

  it('should handle filenames without extension', () => {
    expect(createThumbnailFilename('receipt')).toBe('receipt-thumbnail');
    expect(createThumbnailFilename('noextension')).toBe('noextension-thumbnail');
  });

  it('should handle long Azure-style filenames', () => {
    expect(createThumbnailFilename('2025-10-08-DM-7.90-circled-initials-8e8354.jpg'))
      .toBe('2025-10-08-DM-7.90-circled-initials-8e8354-thumbnail.jpg');
  });

  it('should preserve original filename structure', () => {
    expect(createThumbnailFilename('2025-01-01-Store-15.00-abc123.png'))
      .toBe('2025-01-01-Store-15.00-abc123-thumbnail.png');
  });
});
