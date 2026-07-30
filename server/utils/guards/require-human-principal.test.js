import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { requireHumanPrincipal } from './require-human-principal.js'

// createError and logSecurityEvent are Nuxt auto-imports, unavailable in a bare
// vitest run. Stub them so the guard body is exercisable.
const logSecurityEvent = vi.fn()

beforeEach(() => {
  vi.stubGlobal('logSecurityEvent', logSecurityEvent)
  vi.stubGlobal('createError', ({ statusCode, message }) => {
    const err = new Error(message)
    err.statusCode = statusCode
    return err
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  logSecurityEvent.mockReset()
})

const humanEvent = () => ({ context: { userId: 'user_123', householdId: 'hh_1' } })
const taskEvent = () => ({
  context: {
    taskId: 'receipt-workflow',
    taskActions: ['expense:write'],
    securityPrincipal: 'task:receipt-workflow',
  },
})

describe('requireHumanPrincipal', () => {
  it('should allow a human principal', () => {
    expect(() => requireHumanPrincipal(humanEvent())).not.toThrow()
    expect(logSecurityEvent).not.toHaveBeenCalled()
  })

  it('should reject a task principal with 403', () => {
    expect(() => requireHumanPrincipal(taskEvent())).toThrow(/Forbidden/)
  })

  // A task holding expense:write must still be refused — that grant is for its
  // own PUT, not for batch endpoints.
  it('should reject a task even when it holds a write grant', () => {
    try {
      requireHumanPrincipal(taskEvent())
    }
    catch (err) {
      expect(err.statusCode).toBe(403)
    }
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.anything(),
      'warn',
      expect.objectContaining({ reason: 'task_principal_on_human_only_endpoint' }),
      expect.any(String),
    )
  })

  it('should reject an unauthenticated event', () => {
    expect(() => requireHumanPrincipal({ context: {} })).toThrow(/Forbidden/)
  })
})
