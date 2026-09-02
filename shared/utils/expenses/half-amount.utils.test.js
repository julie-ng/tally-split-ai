import { describe, it, expect } from 'vitest'
import { calculateHalfAmount } from './half-amount.utils.js'

describe('calculateHalfAmount', () => {
  it('halves an even amount exactly', () => {
    expect(calculateHalfAmount(40)).toBe(20)
  })

  it('halves an even-cent amount exactly', () => {
    expect(calculateHalfAmount(41.94)).toBe(20.97)
  })

  it('floors an odd-cent amount (intentionally loses the remainder cent)', () => {
    // 41.95 / 2 = 20.975 → floored to 20.97; 20.97 + 20.97 = 41.94
    expect(calculateHalfAmount(41.95)).toBe(20.97)
  })

  it('returns 0 for a zero amount', () => {
    expect(calculateHalfAmount(0)).toBe(0)
  })

  it('floors a value just above a cent boundary (float safety)', () => {
    // 0.30 / 2 = 0.15 exactly
    expect(calculateHalfAmount(0.30)).toBe(0.15)
  })

  it('floors a sub-cent half down to the lower cent', () => {
    // 0.01 / 2 = 0.005 → floored to 0.00
    expect(calculateHalfAmount(0.01)).toBe(0)
  })

  it('handles larger amounts', () => {
    expect(calculateHalfAmount(123.46)).toBe(61.73)
  })

  it('halves 2.30 without dropping an extra cent to float error', () => {
    // 2.30 / 2 * 100 === 114.99999999999999 pre-fix -> floored to 1.14 (wrong)
    expect(calculateHalfAmount(2.30)).toBe(1.15)
  })

  it('halves 0.58 without dropping an extra cent to float error', () => {
    expect(calculateHalfAmount(0.58)).toBe(0.29)
  })

  it('halves 1.14 without dropping an extra cent to float error', () => {
    expect(calculateHalfAmount(1.14)).toBe(0.57)
  })

  it('halves 4.02 without dropping an extra cent to float error', () => {
    expect(calculateHalfAmount(4.02)).toBe(2.01)
  })
})
