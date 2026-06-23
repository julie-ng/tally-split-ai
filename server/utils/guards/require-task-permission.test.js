import { describe, it, expect } from 'vitest'
import { _deriveResource, _derivePermission } from './require-task-permission.js'

describe('_deriveResource', () => {
  it('should return "receipt" for /api/receipts paths', () => {
    expect(_deriveResource('/api/receipts')).toBe('receipt')
    expect(_deriveResource('/api/receipts/123')).toBe('receipt')
  })

  it('should return "upload" for /api/uploads paths', () => {
    expect(_deriveResource('/api/uploads')).toBe('upload')
    expect(_deriveResource('/api/uploads/abc123')).toBe('upload')
  })

  // HMAC scope remains 'split' even though the route renamed to /api/expenses
  it('should return "split" for /api/expenses paths', () => {
    expect(_deriveResource('/api/expenses')).toBe('split')
    expect(_deriveResource('/api/expenses/456')).toBe('split')
  })

  it('should return "workflow" for /api/workflows paths', () => {
    expect(_deriveResource('/api/workflows')).toBe('workflow')
    expect(_deriveResource('/api/workflows/runs/uuid/status')).toBe('workflow')
    expect(_deriveResource('/api/workflows/callback/uuid')).toBe('workflow')
  })

  it('should return null for unrecognized paths', () => {
    expect(_deriveResource('/api/unknown')).toBeNull()
    expect(_deriveResource('/api/blobs')).toBeNull()
    expect(_deriveResource('/some/other/path')).toBeNull()
  })
})

describe('_derivePermission', () => {
  it('should return "read" for GET', () => {
    expect(_derivePermission('GET')).toBe('read')
  })

  it('should return "write" for POST', () => {
    expect(_derivePermission('POST')).toBe('write')
  })

  it('should return "write" for PUT', () => {
    expect(_derivePermission('PUT')).toBe('write')
  })

  it('should return "delete" for DELETE', () => {
    expect(_derivePermission('DELETE')).toBe('delete')
  })

  it('should return null for unrecognized methods', () => {
    expect(_derivePermission('PATCH')).toBeNull()
    expect(_derivePermission('OPTIONS')).toBeNull()
    expect(_derivePermission('')).toBeNull()
  })
})
