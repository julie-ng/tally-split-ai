import { describe, it, expect } from 'vitest';
import { formatBytes } from './file.utils.js';

describe('formatBytes()', () => {
  it('should format zero bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('should format bytes (< 1024)', () => {
    expect(formatBytes(500)).toBe('500 Bytes');
    expect(formatBytes(1023)).toBe('1023 Bytes');
  });

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(463130)).toBe('452 KB');
    expect(formatBytes(1536)).toBe('2 KB');
    expect(formatBytes(102400)).toBe('100 KB');
  });

  it('should format megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1572864)).toBe('1.5 MB');
    expect(formatBytes(5242880)).toBe('5 MB');
    expect(formatBytes(10485760)).toBe('10 MB');
  });

  it('should round KB values', () => {
    expect(formatBytes(1536)).toBe('2 KB');
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('should remove trailing zeros from MB values', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(2097152)).toBe('2 MB');
    expect(formatBytes(5242880)).toBe('5 MB');
  });

  it('should preserve decimal places for non-zero MB values', () => {
    expect(formatBytes(1638400)).toBe('1.6 MB');
    expect(formatBytes(1572864)).toBe('1.5 MB');
    expect(formatBytes(2516582)).toBe('2.4 MB');
  });
});
