import { describe, it, expect, vi } from 'vitest'
import { redactConnectionString, safeLogConnectionString } from './connection-string.utils.js'

describe('redactConnectionString', () => {
  it('masks user and password in a standard postgres URL', () => {
    const result = redactConnectionString('postgresql://alice:s3cret@db.example.com:5432/mydb')
    expect(result).toContain('REDACTED:REDACTED@')
    expect(result).not.toContain('alice')
    expect(result).not.toContain('s3cret')
    expect(result).toContain('db.example.com:5432')
    expect(result).toContain('/mydb')
  })

  it('masks credentials even with special characters in the password', () => {
    const result = redactConnectionString('postgresql://user:p%40ss%21@host:6543/db')
    expect(result).not.toContain('p%40ss')
    expect(result).toContain('REDACTED')
    expect(result).toContain('host:6543')
  })

  it('leaves host/db intact when there is no userinfo', () => {
    const result = redactConnectionString('postgresql://localhost:5432/ai_receipts')
    expect(result).toContain('localhost:5432')
    expect(result).toContain('ai_receipts')
  })

  it('returns a placeholder for empty/invalid input', () => {
    expect(redactConnectionString('')).toBe('(no connection string)')
    expect(redactConnectionString(null)).toBe('(no connection string)')
    expect(redactConnectionString(undefined)).toBe('(no connection string)')
  })

  it('falls back to regex masking for unparseable strings with userinfo', () => {
    const result = redactConnectionString('weird://user:pass@host/db extra junk')
    expect(result).not.toContain('user:pass')
    expect(result).toContain('REDACTED:REDACTED@')
  })
})

describe('safeLogConnectionString', () => {
  it('logs the redacted string with the given label and never the credentials', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    safeLogConnectionString('postgresql://alice:s3cret@db.example.com:5432/mydb', 'Target')

    expect(spy).toHaveBeenCalledOnce()
    const logged = spy.mock.calls[0][0]
    expect(logged).toContain('Target:')
    expect(logged).not.toContain('alice')
    expect(logged).not.toContain('s3cret')
    expect(logged).toContain('REDACTED')

    spy.mockRestore()
  })
})
