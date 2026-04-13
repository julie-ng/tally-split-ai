import { describe, it, expect } from 'vitest'
import { deriveResource, derivePermission } from './require-task-permission.js'

describe('deriveResource', () => {
  it('should return "receipt" for /api/receipts paths', () => {
    expect(deriveResource('/api/receipts')).toBe('receipt')
    expect(deriveResource('/api/receipts/123')).toBe('receipt')
  })

  it('should return "upload" for /api/uploads paths', () => {
    expect(deriveResource('/api/uploads')).toBe('upload')
    expect(deriveResource('/api/uploads/abc123')).toBe('upload')
  })

  it('should return "split" for /api/splits paths', () => {
    expect(deriveResource('/api/splits')).toBe('split')
    expect(deriveResource('/api/splits/456')).toBe('split')
  })

  it('should return "workflow" for /api/workflows paths', () => {
    expect(deriveResource('/api/workflows')).toBe('workflow')
    expect(deriveResource('/api/workflows/runs/uuid/status')).toBe('workflow')
    expect(deriveResource('/api/workflows/callback/uuid')).toBe('workflow')
  })

  it('should return null for unrecognized paths', () => {
    expect(deriveResource('/api/unknown')).toBeNull()
    expect(deriveResource('/api/blobs')).toBeNull()
    expect(deriveResource('/some/other/path')).toBeNull()
  })
})

describe('derivePermission', () => {
  it('should return "read" for GET', () => {
    expect(derivePermission('GET')).toBe('read')
  })

  it('should return "write" for POST', () => {
    expect(derivePermission('POST')).toBe('write')
  })

  it('should return "write" for PUT', () => {
    expect(derivePermission('PUT')).toBe('write')
  })

  it('should return "delete" for DELETE', () => {
    expect(derivePermission('DELETE')).toBe('delete')
  })

  it('should return null for unrecognized methods', () => {
    expect(derivePermission('PATCH')).toBeNull()
    expect(derivePermission('OPTIONS')).toBeNull()
    expect(derivePermission('')).toBeNull()
  })
})
