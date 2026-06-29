import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { globSync } from 'glob'

/**
 * History Tracking Coverage Tests
 *
 * Ensures POST and PUT API endpoints for receipts and expenses call the
 * appropriate history tracking function. DELETE endpoints are excluded —
 * deletion is handled by FK cascade at the schema layer (see
 * project_change_history.md), so handlers no longer write history.
 *
 * NOTE: "delete semantics, POST method" endpoints (e.g. batch delete uses
 * `delete.post.js` so the { ids } body survives proxies that strip DELETE
 * bodies) are ALSO excluded — they're deletes, not state-mutating writes, so the
 * same FK-cascade rationale applies. We match these by filename, not HTTP method.
 *
 * This is a static analysis test — it reads source files and checks
 * for the presence of trackChanges/trackCreate/trackBatchChanges calls.
 * It catches the case where someone adds or modifies an endpoint
 * without wiring up history tracking.
 *
 * KNOWN LIMITATION: This is a regex match against source text, not runtime
 * verification. A commented-out call containing the function name (e.g.
 * `// await trackChanges(...)`) will pass the test. This test catches
 * accidental omissions, not intentional bypasses. A true integration test
 * against a running server + database would be needed for full coverage.
 */

const TRACK_FUNCTIONS = ['trackChanges', 'trackCreate', 'trackBatchChanges']
const TRACK_PATTERN = new RegExp(`(${TRACK_FUNCTIONS.join('|')})\\(`)

// Filenames that are deletes (regardless of HTTP method) and so are exempt from
// history tracking — deletion is handled by FK cascade, not handler writes.
const DELETE_SEMANTICS = /(^|\.)delete\.(post|put)\.js$/

function getMutatingEndpoints (dir) {
  const pattern = resolve(dir, '*.{post,put}.js')
  return globSync(pattern).filter(f => !DELETE_SEMANTICS.test(f.split('/').pop()))
}

function fileContainsTracking (filePath) {
  const content = readFileSync(filePath, 'utf-8')
  return TRACK_PATTERN.test(content)
}

describe('History tracking coverage', () => {
  describe('receipts endpoints', () => {
    const endpoints = getMutatingEndpoints('server/api/receipts')

    it('should have mutating endpoints to test', () => {
      expect(endpoints.length).toBeGreaterThan(0)
    })

    for (const filePath of endpoints) {
      const filename = filePath.split('/').pop()
      it(`${filename} should call a track function`, () => {
        expect(fileContainsTracking(filePath)).toBe(true)
      })
    }
  })

  describe('expenses endpoints', () => {
    const endpoints = getMutatingEndpoints('server/api/expenses')

    it('should have mutating endpoints to test', () => {
      expect(endpoints.length).toBeGreaterThan(0)
    })

    for (const filePath of endpoints) {
      const filename = filePath.split('/').pop()
      it(`${filename} should call a track function`, () => {
        expect(fileContainsTracking(filePath)).toBe(true)
      })
    }
  })
})
