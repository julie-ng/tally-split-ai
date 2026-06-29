import { describe, it, expect } from 'vitest'
import { resolveShares } from './resolve-shares.utils.js'

describe('resolveShares', () => {
  it('trusts a valid asymmetric allocation that sums to the total', () => {
    expect(resolveShares(40, { user1: 30, user2: 10 })).toEqual({
      userOneShare: 30,
      userTwoShare: 10,
      usedFallback: false,
    })
  })

  it('trusts a 0 / full allocation (one person owes everything)', () => {
    // The worked example: Matt (user2) owes the whole circled €5, Julie 0.
    expect(resolveShares(5, { user1: 0, user2: 5 })).toEqual({
      userOneShare: 0,
      userTwoShare: 5,
      usedFallback: false,
    })
  })

  it('trusts an even allocation', () => {
    expect(resolveShares(20, { user1: 10, user2: 10 })).toEqual({
      userOneShare: 10,
      userTwoShare: 10,
      usedFallback: false,
    })
  })

  it('floors each share to the cent (round-down rule)', () => {
    expect(resolveShares(10.01, { user1: 5.005, user2: 5.005 })).toEqual({
      userOneShare: 5,
      userTwoShare: 5,
      usedFallback: false,
    })
  })

  it('accepts sums within a 1-cent rounding tolerance', () => {
    const r = resolveShares(10, { user1: 3.33, user2: 6.67 })
    expect(r.usedFallback).toBe(false)
    expect(r.userOneShare).toBe(3.33)
    expect(r.userTwoShare).toBe(6.67)
  })

  it('falls back to 50/50 when shares do not sum to the total', () => {
    expect(resolveShares(40, { user1: 30, user2: 5 })).toEqual({
      userOneShare: 20,
      userTwoShare: 20,
      usedFallback: true,
    })
  })

  it('falls back when a share is non-numeric', () => {
    expect(resolveShares(40, { user1: 40, user2: null })).toEqual({
      userOneShare: 20,
      userTwoShare: 20,
      usedFallback: true,
    })
  })

  it('falls back when a share is negative', () => {
    expect(resolveShares(40, { user1: 50, user2: -10 })).toEqual({
      userOneShare: 20,
      userTwoShare: 20,
      usedFallback: true,
    })
  })

  it('falls back when shares is missing entirely', () => {
    expect(resolveShares(41.95, null)).toEqual({
      userOneShare: 20.97,
      userTwoShare: 20.97,
      usedFallback: true,
    })
  })

  it('returns nulls (no fallback) when adjustedTotal is null', () => {
    expect(resolveShares(null, { user1: 5, user2: 5 })).toEqual({
      userOneShare: null,
      userTwoShare: null,
      usedFallback: false,
    })
  })
})
