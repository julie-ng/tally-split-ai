import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { globSync } from 'glob'

/**
 * Security Boundary Tests
 *
 * Static analysis tests that enforce architectural security boundaries:
 * 1. Trigger tasks must NOT have direct DB access (no server/db/connection imports)
 * 2. API endpoints must use requireAuthentication (not the old requireUserId)
 * 3. Resource-specific endpoints must call requireAuthorization
 *
 * Known limitation: regex-based, can be bypassed by commented-out code.
 */

function getFiles (dir, pattern) {
  return globSync(resolve(dir, pattern))
}

function fileContains (filePath, pattern) {
  const content = readFileSync(filePath, 'utf-8')
  return pattern.test(content)
}

describe('Security boundaries: trigger tasks have no direct DB access', () => {
  const taskFiles = getFiles('trigger', '*.js')

  it('should have task files to test', () => {
    expect(taskFiles.length).toBeGreaterThan(0)
  })

  for (const filePath of taskFiles) {
    const filename = filePath.split('/').pop()

    it(`${filename} should not import from server/db/connection`, () => {
      expect(fileContains(filePath, /server\/db\/connection/)).toBe(false)
    })

    it(`${filename} should not import useDB`, () => {
      expect(fileContains(filePath, /useDB/)).toBe(false)
    })

    it(`${filename} should not import drizzle-orm`, () => {
      expect(fileContains(filePath, /drizzle-orm/)).toBe(false)
    })
  }
})

describe('Security boundaries: no requireUserId in API endpoints', () => {
  const apiFiles = getFiles('server/api', '**/*.js')

  it('should have API files to test', () => {
    expect(apiFiles.length).toBeGreaterThan(0)
  })

  for (const filePath of apiFiles) {
    const relative = filePath.split('server/api/').pop()
    it(`${relative} should not use requireUserId`, () => {
      expect(fileContains(filePath, /requireUserId/)).toBe(false)
    })
  }
})

describe('Security boundaries: resource-specific endpoints call requireAuthorization', () => {
  // Endpoints that handle a specific resource ID (param in brackets) must authorize
  const resourceEndpoints = [
    ...getFiles('server/api/receipts', '\\[*\\].*.js'),
    ...getFiles('server/api/splits', '\\[*\\].*.js'),
    ...getFiles('server/api/uploads', '\\[*\\].*.js'),
  ]

  it('should have resource endpoints to test', () => {
    expect(resourceEndpoints.length).toBeGreaterThan(0)
  })

  for (const filePath of resourceEndpoints) {
    const relative = filePath.split('server/api/').pop()
    it(`${relative} should call requireAuthorization`, () => {
      expect(fileContains(filePath, /requireAuthorization\(/)).toBe(true)
    })
  }
})

describe('Security boundaries: requireAuthorization uses correct resource parameter', () => {
  // Each resource type must pass the correct parameter name to requireAuthorization.
  // This catches bugs like passing {} or the wrong resource ID.
  const resourceTypes = [
    { dir: 'server/api/receipts', pattern: '\\[*\\].*.js', expectedParam: 'receiptId' },
    { dir: 'server/api/splits', pattern: '\\[*\\].*.js', expectedParam: 'splitId' },
    { dir: 'server/api/uploads', pattern: '\\[*\\].*.js', expectedParam: 'uploadHashId' },
  ]

  for (const { dir, pattern, expectedParam } of resourceTypes) {
    const files = getFiles(dir, pattern)

    for (const filePath of files) {
      const relative = filePath.split('server/api/').pop()
      it(`${relative} should pass { ${expectedParam} } to requireAuthorization`, () => {
        const content = readFileSync(filePath, 'utf-8')
        const authzCallRegex = new RegExp(`requireAuthorization\\(event,\\s*\\{[^}]*${expectedParam}`)
        expect(authzCallRegex.test(content)).toBe(true)
      })
    }
  }
})
