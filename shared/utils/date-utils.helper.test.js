import { describe, it, expect } from 'vitest';
import { dateUtils } from './date-utils.helper.js';

describe('formatDate()', () => {
  it('should format date in shortened format', () => {
    const date = new Date('2025-12-07T11:39:19+01:00');
    const formatted = dateUtils.formatDate(date);

    expect(formatted).toMatch(/^\d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2} [A-Z]+[+-]?\d*$/);
    expect(formatted).toContain('07');
    expect(formatted).toContain('Dec');
    expect(formatted).toContain('2025');
  });

  it('should pad single-digit days with zero', () => {
    const date = new Date('2025-01-05T10:30:00');
    const formatted = dateUtils.formatDate(date);

    expect(formatted).toMatch(/^05 /);
  });

  it('should pad single-digit hours with zero', () => {
    const date = new Date('2025-12-07T09:05:00');
    const formatted = dateUtils.formatDate(date);

    expect(formatted).toMatch(/09:05/);
  });

  it('should handle different months', () => {
    const jan = new Date('2025-01-15T12:00:00');
    const jun = new Date('2025-06-20T12:00:00');
    const dec = new Date('2025-12-25T12:00:00');

    expect(dateUtils.formatDate(jan)).toContain('Jan');
    expect(dateUtils.formatDate(jun)).toContain('Jun');
    expect(dateUtils.formatDate(dec)).toContain('Dec');
  });

  it('should include timezone abbreviation', () => {
    const date = new Date('2025-12-07T11:39:19');
    const formatted = dateUtils.formatDate(date);

    // Timezone should be at the end (e.g., PST, GMT+1, EST)
    expect(formatted).toMatch(/[A-Z]+[+-]?\d*$/);
  });
});
