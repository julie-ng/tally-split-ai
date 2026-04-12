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
 * 3. Trigger tasks must use the API client, not direct DB imports
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
