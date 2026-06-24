import { describe, it, expect } from 'vitest'
import { mapTriggerStatusToWorkflowStatus } from './trigger-status-map.utils.js'
import { WORKFLOW_STATUS } from '#shared/enums/workflow-status.js'

describe('mapTriggerStatusToWorkflowStatus', () => {
  it('maps EXPIRED to our EXPIRED (the "no worker" signal)', () => {
    expect(mapTriggerStatusToWorkflowStatus('EXPIRED')).toBe(WORKFLOW_STATUS.EXPIRED)
  })

  it('maps terminal crash/failure states to FAILED', () => {
    expect(mapTriggerStatusToWorkflowStatus('TIMED_OUT')).toBe(WORKFLOW_STATUS.FAILED)
    expect(mapTriggerStatusToWorkflowStatus('CRASHED')).toBe(WORKFLOW_STATUS.FAILED)
    expect(mapTriggerStatusToWorkflowStatus('SYSTEM_FAILURE')).toBe(WORKFLOW_STATUS.FAILED)
    expect(mapTriggerStatusToWorkflowStatus('FAILED')).toBe(WORKFLOW_STATUS.FAILED)
    expect(mapTriggerStatusToWorkflowStatus('CANCELED')).toBe(WORKFLOW_STATUS.FAILED)
  })

  it('returns null for in-flight states (leave the run alone)', () => {
    expect(mapTriggerStatusToWorkflowStatus('QUEUED')).toBeNull()
    expect(mapTriggerStatusToWorkflowStatus('EXECUTING')).toBeNull()
    expect(mapTriggerStatusToWorkflowStatus('WAITING')).toBeNull()
    expect(mapTriggerStatusToWorkflowStatus('REATTEMPTING')).toBeNull()
  })

  it('returns null for COMPLETED — never synthesizes success', () => {
    expect(mapTriggerStatusToWorkflowStatus('COMPLETED')).toBeNull()
  })

  it('returns null for empty / unknown input', () => {
    expect(mapTriggerStatusToWorkflowStatus(null)).toBeNull()
    expect(mapTriggerStatusToWorkflowStatus(undefined)).toBeNull()
    expect(mapTriggerStatusToWorkflowStatus('')).toBeNull()
    expect(mapTriggerStatusToWorkflowStatus('SOMETHING_NEW')).toBeNull()
  })
})
