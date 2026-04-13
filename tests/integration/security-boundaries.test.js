import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { globSync } from 'glob'
import { TASK_PERMISSIONS, TASK_CHILDREN, VALID_RESOURCES, VALID_PERMISSIONS } from '../../shared/config/task-permissions.js'

/**
 * Security Boundary Tests
 *
 * Static analysis tests that enforce architectural security boundaries:
 * 1. Trigger tasks must NOT have direct DB access (no server/db/connection imports)
 * 2. API endpoints must use requireAuthentication (not the old requireUserId)
 * 3. Resource-specific endpoints must call requireAuthorization
 * 4. Task-facing endpoints must call requireTaskPermission
 * 5. Permissions map must cover all known task IDs
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
  const taskFiles = getFiles('trigger', '**/*.js')

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

describe('Security boundaries: task-facing endpoints call requireTaskPermission', () => {
  // Endpoints that tasks call must enforce action-scoped permissions.
  // This list must be updated when tasks start calling new endpoints.
  const taskFacingEndpoints = [
    'server/api/uploads/[hashId].get.js',
    'server/api/uploads/[hashId].put.js',
    'server/api/receipts/index.post.js',
    'server/api/receipts/[id].get.js',
    'server/api/receipts/[id].put.js',
    'server/api/splits/index.post.js',
    'server/api/workflows/runs/[runUuid]/status.put.js',
    'server/api/workflows/runs/[runUuid]/tokens.post.js',
    'server/api/workflows/callback/[runUuid].post.js',
  ]

  for (const endpoint of taskFacingEndpoints) {
    const relative = endpoint.replace('server/api/', '')
    it(`${relative} should call requireTaskPermission`, () => {
      const content = readFileSync(resolve(endpoint), 'utf-8')
      expect(/requireTaskPermission\(event\)/.test(content)).toBe(true)
    })
  }
})

describe('Security boundaries: permissions map covers all trigger task IDs', () => {
  const taskFiles = getFiles('trigger', '**/*.js')

  // Extract task IDs from trigger files (lines like: const TASK_ID = 'analyze-ocr')
  const taskIds = []
  for (const filePath of taskFiles) {
    const content = readFileSync(filePath, 'utf-8')
    const match = content.match(/const TASK_ID\s*=\s*'([^']+)'/)
    if (match) taskIds.push(match[1])
  }

  it('should find task IDs in trigger files', () => {
    expect(taskIds.length).toBeGreaterThan(0)
  })

  for (const taskId of taskIds) {
    it(`${taskId} should be in TASK_PERMISSIONS map`, () => {
      expect(TASK_PERMISSIONS[taskId]).toBeDefined()
    })
  }

  it('all actions in TASK_PERMISSIONS should use valid resource:permission format', () => {
    for (const [taskId, actions] of Object.entries(TASK_PERMISSIONS)) {
      for (const action of actions) {
        const [resource, permission] = action.split(':')
        expect(VALID_RESOURCES, `${taskId}: unknown resource '${resource}'`).toContain(resource)
        expect(VALID_PERMISSIONS, `${taskId}: unknown permission '${permission}'`).toContain(permission)
      }
    }
  })

  it('all TASK_CHILDREN entries should reference tasks in TASK_PERMISSIONS', () => {
    for (const [orchestrator, children] of Object.entries(TASK_CHILDREN)) {
      expect(TASK_PERMISSIONS[orchestrator], `orchestrator '${orchestrator}' not in TASK_PERMISSIONS`).toBeDefined()
      for (const childId of children) {
        expect(TASK_PERMISSIONS[childId], `child '${childId}' of '${orchestrator}' not in TASK_PERMISSIONS`).toBeDefined()
      }
    }
  })
})

describe('Security boundaries: task AuthZ handles first-time receipt linking', () => {
  // When a task creates a receipt and links it to an upload, the upload's receiptId
  // is null at auth time (workflow run was fetched before the link). The AuthZ must
  // fall back to verifying the receipt belongs to the same user as the upload,
  // rather than rejecting with receipt_scope_mismatch.
  it('require-authorization.js should handle null expectedReceiptId with owner check', () => {
    const content = readFileSync(resolve('server/utils/require-authorization.js'), 'utf-8')
    expect(content).toContain('receipt_owner_mismatch')
    expect(content).toContain('receipt.userId !== upload?.userId')
  })

  it('require-authorization.js should handle null expectedSplitId with owner check', () => {
    const content = readFileSync(resolve('server/utils/require-authorization.js'), 'utf-8')
    expect(content).toContain('split_owner_mismatch')
    expect(content).toContain('split.userId !== upload?.userId')
  })
})
