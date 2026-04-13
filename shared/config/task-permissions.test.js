import { describe, it, expect } from 'vitest'
import {
  TASK_PERMISSIONS,
  VALID_RESOURCES,
  VALID_PERMISSIONS,
  getTaskActions,
  serializeActions,
} from './task-permissions.js'

describe('TASK_PERMISSIONS', () => {
  it('should have entries for all known tasks', () => {
    const expectedTasks = ['receipt-workflow', 'analyze-ocr', 'analyze-annotations', 'create-split']
    for (const taskId of expectedTasks) {
      expect(TASK_PERMISSIONS[taskId]).toBeDefined()
    }
  })

  it('should only contain valid resource:permission format', () => {
    for (const [taskId, actions] of Object.entries(TASK_PERMISSIONS)) {
      for (const action of actions) {
        const [resource, permission] = action.split(':')
        expect(VALID_RESOURCES, `${taskId} has unknown resource '${resource}' in '${action}'`).toContain(resource)
        expect(VALID_PERMISSIONS, `${taskId} has unknown permission '${permission}' in '${action}'`).toContain(permission)
      }
    }
  })

  it('should not have duplicate entries per task', () => {
    for (const [taskId, actions] of Object.entries(TASK_PERMISSIONS)) {
      const unique = new Set(actions)
      expect(unique.size, `${taskId} has duplicate actions`).toBe(actions.length)
    }
  })
})

describe('getTaskActions', () => {
  it('should return sorted actions for a known task', () => {
    const actions = getTaskActions('analyze-ocr')
    expect(actions).toEqual([...actions].sort())
  })

  it('should return a new array (not a reference to the original)', () => {
    const a = getTaskActions('analyze-ocr')
    const b = getTaskActions('analyze-ocr')
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })

  it('should throw for unknown taskId', () => {
    expect(() => getTaskActions('unknown-task')).toThrow('Unknown task ID: unknown-task')
  })
})

describe('serializeActions', () => {
  it('should sort and join actions with commas', () => {
    const result = serializeActions(['upload:write', 'receipt:read', 'upload:read'])
    expect(result).toBe('receipt:read,upload:read,upload:write')
  })

  it('should be deterministic regardless of input order', () => {
    const a = serializeActions(['workflow:write', 'upload:read', 'receipt:write'])
    const b = serializeActions(['receipt:write', 'workflow:write', 'upload:read'])
    expect(a).toBe(b)
  })

  it('should handle single-element arrays', () => {
    expect(serializeActions(['workflow:read'])).toBe('workflow:read')
  })

  it('should handle empty arrays', () => {
    expect(serializeActions([])).toBe('')
  })

  it('should throw for invalid resource', () => {
    expect(() => serializeActions(['bogus:read'])).toThrow('Invalid action format: \'bogus:read\'')
  })

  it('should throw for invalid permission', () => {
    expect(() => serializeActions(['upload:hack'])).toThrow('Invalid action format: \'upload:hack\'')
  })

  it('should throw for malformed action string', () => {
    expect(() => serializeActions(['notanaction'])).toThrow('Invalid action format: \'notanaction\'')
  })
})
