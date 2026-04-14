import { describe, it, expect } from 'vitest'
import { checkUserOwnership } from './check-user-ownership.js'

describe('checkUserOwnership', () => {
  it('should pass when userId matches', () => {
    expect(checkUserOwnership('user-1', 'user-1')).toEqual({ ok: true })
  })

  it('should fail when userId does not match', () => {
    expect(checkUserOwnership('user-2', 'user-1')).toEqual({ ok: false, reason: 'not_owned' })
  })

  it('should fail when resourceUserId is null', () => {
    expect(checkUserOwnership(null, 'user-1')).toEqual({ ok: false, reason: 'not_owned' })
  })

  it('should fail when resourceUserId is undefined', () => {
    expect(checkUserOwnership(undefined, 'user-1')).toEqual({ ok: false, reason: 'not_owned' })
  })
})
