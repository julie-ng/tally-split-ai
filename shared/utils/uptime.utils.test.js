import { describe, it, expect } from 'vitest'
import { uptimeUtils } from './uptime.utils.js'

describe('uptimeUtils.formatUptime', () => {
  it('returns "0 seconds" for zero', () => {
    expect(uptimeUtils.formatUptime(0)).toBe('0 seconds')
  })

  it('floors sub-second durations to "0 seconds"', () => {
    expect(uptimeUtils.formatUptime(0.9)).toBe('0 seconds')
  })

  it('formats a single second (singular)', () => {
    expect(uptimeUtils.formatUptime(1)).toBe('1 second')
  })

  it('formats multiple seconds (plural)', () => {
    expect(uptimeUtils.formatUptime(34)).toBe('34 seconds')
  })

  it('drops zero-valued lower units', () => {
    expect(uptimeUtils.formatUptime(60)).toBe('1 minute')
  })

  it('joins two parts with "and"', () => {
    expect(uptimeUtils.formatUptime(1234)).toBe('20 minutes and 34 seconds')
  })

  it('joins three parts with commas and "and"', () => {
    // 1h 1m 1s
    expect(uptimeUtils.formatUptime(3661)).toBe('1 hour, 1 minute and 1 second')
  })

  it('joins four parts with commas and "and"', () => {
    // 1d 1h 1m 1s = 86400 + 3600 + 60 + 1
    expect(uptimeUtils.formatUptime(90061)).toBe('1 day, 1 hour, 1 minute and 1 second')
  })

  it('pluralizes days, hours, minutes together', () => {
    // 2d 3h 4m 5s = 2*86400 + 3*3600 + 4*60 + 5
    expect(uptimeUtils.formatUptime(183845)).toBe('2 days, 3 hours, 4 minutes and 5 seconds')
  })

  it('skips a zero middle unit', () => {
    // 1d 0h 0m 1s = 86400 + 1
    expect(uptimeUtils.formatUptime(86401)).toBe('1 day and 1 second')
  })

  it('floors fractional seconds within a larger duration', () => {
    expect(uptimeUtils.formatUptime(65.7)).toBe('1 minute and 5 seconds')
  })
})
