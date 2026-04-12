import { describe, it, expect } from 'vitest'
import { toText, diffFields, snapshotFields } from './diff.utils.js'

describe('toText', () => {
  it('should return null for null', () => {
    expect(toText(null)).toBe(null)
  })

  it('should return null for undefined', () => {
    expect(toText(undefined)).toBe(null)
  })

  it('should stringify numbers', () => {
    expect(toText(14.14)).toBe('14.14')
  })

  it('should stringify booleans', () => {
    expect(toText(true)).toBe('true')
    expect(toText(false)).toBe('false')
  })

  it('should pass strings through', () => {
    expect(toText('hello')).toBe('hello')
  })
})

describe('diffFields', () => {
  it('should detect changed fields', () => {
    const before = { merchantName: 'REWE', total: 14.14 }
    const after = { merchantName: 'REWE Center', total: 14.14 }
    const diffs = diffFields(before, after)
    expect(diffs).toEqual([
      { field: 'merchantName', oldValue: 'REWE', newValue: 'REWE Center' },
    ])
  })

  it('should detect multiple changed fields', () => {
    const before = { merchantName: 'REWE', total: 14.14 }
    const after = { merchantName: 'REWE Center', total: 15.00 }
    const diffs = diffFields(before, after)
    expect(diffs).toHaveLength(2)
  })

  it('should skip unchanged fields', () => {
    const before = { merchantName: 'REWE', total: 14.14 }
    const after = { merchantName: 'REWE', total: 14.14 }
    expect(diffFields(before, after)).toEqual([])
  })

  it('should skip id, createdAt, updatedAt', () => {
    const before = { id: 1, createdAt: 'old', updatedAt: 'old', merchantName: 'REWE' }
    const after = { id: 2, createdAt: 'new', updatedAt: 'new', merchantName: 'REWE' }
    expect(diffFields(before, after)).toEqual([])
  })

  it('should only compare fields present in after', () => {
    const before = { merchantName: 'REWE', total: 14.14, notes: 'old' }
    const after = { merchantName: 'REWE Center' }
    const diffs = diffFields(before, after)
    expect(diffs).toEqual([
      { field: 'merchantName', oldValue: 'REWE', newValue: 'REWE Center' },
    ])
  })

  it('should handle null to value transitions', () => {
    const before = { notes: null }
    const after = { notes: 'new note' }
    const diffs = diffFields(before, after)
    expect(diffs).toEqual([
      { field: 'notes', oldValue: null, newValue: 'new note' },
    ])
  })

  it('should handle value to null transitions', () => {
    const before = { notes: 'old note' }
    const after = { notes: null }
    const diffs = diffFields(before, after)
    expect(diffs).toEqual([
      { field: 'notes', oldValue: 'old note', newValue: null },
    ])
  })
})

describe('snapshotFields', () => {
  it('should snapshot create (null → value)', () => {
    const row = { merchantName: 'REWE', total: 14.14 }
    const fields = snapshotFields(row, 'create')
    expect(fields).toEqual([
      { field: 'merchantName', oldValue: null, newValue: 'REWE' },
      { field: 'total', oldValue: null, newValue: '14.14' },
    ])
  })

  it('should snapshot delete (value → null)', () => {
    const row = { merchantName: 'REWE', total: 14.14 }
    const fields = snapshotFields(row, 'delete')
    expect(fields).toEqual([
      { field: 'merchantName', oldValue: 'REWE', newValue: null },
      { field: 'total', oldValue: '14.14', newValue: null },
    ])
  })

  it('should skip null fields', () => {
    const row = { merchantName: 'REWE', notes: null }
    const fields = snapshotFields(row, 'create')
    expect(fields).toEqual([
      { field: 'merchantName', oldValue: null, newValue: 'REWE' },
    ])
  })

  it('should skip id, createdAt, updatedAt', () => {
    const row = { id: 1, createdAt: 'ts', updatedAt: 'ts', merchantName: 'REWE' }
    const fields = snapshotFields(row, 'create')
    expect(fields).toEqual([
      { field: 'merchantName', oldValue: null, newValue: 'REWE' },
    ])
  })

  it('should return empty array for row with only null/skipped fields', () => {
    const row = { id: 1, createdAt: 'ts', notes: null }
    expect(snapshotFields(row, 'create')).toEqual([])
  })
})
