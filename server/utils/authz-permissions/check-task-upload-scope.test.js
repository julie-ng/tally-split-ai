import { describe, it, expect } from 'vitest'
import { checkTaskUploadScope } from './check-task-upload-scope.js'

describe('checkTaskUploadScope', () => {
  it('should pass when ids match', () => {
    expect(checkTaskUploadScope('abc123', 'abc123')).toEqual({ ok: true })
  })

  it('should fail when ids differ', () => {
    expect(checkTaskUploadScope('abc123', 'xyz789')).toEqual({ ok: false, reason: 'upload_scope_mismatch' })
  })

  it('should fail when workflow upload id is null', () => {
    expect(checkTaskUploadScope('abc123', null)).toEqual({ ok: false, reason: 'upload_scope_mismatch' })
  })
})
