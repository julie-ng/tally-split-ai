import { describe, it, expect } from 'vitest'
import { summarizeSplits } from './split-summary.utils.js'

const U1 = 'user-one-id'
const U2 = 'user-two-id'

const split = ({ amount = 20, paidBy = U1, shares = true } = {}) => ({
  userOneId: U1,
  userTwoId: U2,
  userOneShare: shares ? amount / 2 : null,
  userTwoShare: shares ? amount / 2 : null,
  paidByUserId: paidBy,
})

describe('summarizeSplits', () => {
  it('empty list', () => {
    const s = summarizeSplits([])
    expect(s.netBalance).toBe(0)
    expect(s.unsettledCount).toBe(0)
    expect(s.pendingCount).toBe(0)
    expect(s.unattributedCount).toBe(0)
  })

  it('userOne paid all → userTwo owes userOne', () => {
    // 3× €20 splits, all paid by userOne. userTwo's share each: €10 → owes €30.
    const s = summarizeSplits([split(), split(), split()])
    expect(s.netBalance).toBe(30)
    expect(s.userOnePaidForUserTwo).toBe(30)
    expect(s.userTwoPaidForUserOne).toBe(0)
  })

  it('userTwo paid all → userOne owes userTwo', () => {
    const s = summarizeSplits([
      split({ paidBy: U2 }),
      split({ paidBy: U2 }),
      split({ paidBy: U2 }),
    ])
    expect(s.netBalance).toBe(-30)
    expect(s.userOnePaidForUserTwo).toBe(0)
    expect(s.userTwoPaidForUserOne).toBe(30)
  })

  it('mixed payments — userOne paid more', () => {
    // userOne paid €20 + €20 = €40 (€20 owed to userOne)
    // userTwo paid €20 (€10 owed to userTwo)
    // net: +€10 → userTwo owes userOne €10
    const s = summarizeSplits([split(), split(), split({ paidBy: U2 })])
    expect(s.netBalance).toBe(10)
    expect(s.userOnePaidForUserTwo).toBe(20)
    expect(s.userTwoPaidForUserOne).toBe(10)
  })

  it('mixed payments — even', () => {
    const s = summarizeSplits([split(), split({ paidBy: U2 })])
    expect(s.netBalance).toBe(0)
    expect(s.userOnePaidForUserTwo).toBe(10)
    expect(s.userTwoPaidForUserOne).toBe(10)
  })

  it('all unattributed — netBalance is 0 but flagged', () => {
    const s = summarizeSplits([
      split({ paidBy: null }),
      split({ paidBy: null }),
    ])
    expect(s.netBalance).toBe(0)
    expect(s.unattributedCount).toBe(2)
    expect(s.unattributedAmount).toBe(40)
  })

  it('mixed: 2 attributed + 1 unattributed', () => {
    // Two paid by userOne (userTwo owes €20). One unattributed (€20).
    const s = summarizeSplits([split(), split(), split({ paidBy: null })])
    expect(s.netBalance).toBe(20)
    expect(s.unattributedCount).toBe(1)
    expect(s.unattributedAmount).toBe(20)
  })

  it('pending splits (no shares yet) are counted but ignored from totals', () => {
    const s = summarizeSplits([split(), split({ shares: false })])
    expect(s.netBalance).toBe(10)
    expect(s.pendingCount).toBe(1)
    expect(s.unsettledCount).toBe(2)
  })

  it('uneven shares respected (not just 50/50)', () => {
    // userOne paid; shares are €15/€5. userOne fronted €5 of userTwo's.
    const s = summarizeSplits([{
      userOneId: U1,
      userTwoId: U2,
      userOneShare: 15,
      userTwoShare: 5,
      paidByUserId: U1,
    }])
    expect(s.netBalance).toBe(5)
  })

  it('rounds to 2 decimals', () => {
    const s = summarizeSplits([{
      userOneId: U1,
      userTwoId: U2,
      userOneShare: 3.333,
      userTwoShare: 3.333,
      paidByUserId: U1,
    }])
    expect(s.netBalance).toBe(3.33)
  })
})
