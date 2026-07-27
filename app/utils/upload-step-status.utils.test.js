import { describe, it, expect } from 'vitest'
import { uploadStepStatus } from './upload-step-status.utils.js'
import { UPLOAD_STATUS } from '#shared/enums/upload-status.js'
import { UPLOAD_QUEUE_STATUS } from '#shared/enums/upload-queue-status.js'
import { WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-step-status.js'

describe('uploadStepStatus', () => {
  describe('DB vocabulary (UPLOAD_STATUS)', () => {
    it('maps UPLOADED → COMPLETED', () => {
      expect(uploadStepStatus(UPLOAD_STATUS.UPLOADED)).toBe(WORKFLOW_STEP_STATUS.COMPLETED)
    })

    it('maps FAILED → FAILED', () => {
      expect(uploadStepStatus(UPLOAD_STATUS.FAILED)).toBe(WORKFLOW_STEP_STATUS.FAILED)
    })

    it('maps INITIALIZED → PENDING (row exists, no blob yet)', () => {
      expect(uploadStepStatus(UPLOAD_STATUS.INITIALIZED)).toBe(WORKFLOW_STEP_STATUS.PENDING)
    })
  })

  describe('client vocabulary (UPLOAD_QUEUE_STATUS)', () => {
    it('maps COMPLETED → COMPLETED (same moment as UPLOAD_STATUS.UPLOADED)', () => {
      expect(uploadStepStatus(UPLOAD_QUEUE_STATUS.COMPLETED)).toBe(WORKFLOW_STEP_STATUS.COMPLETED)
    })

    it('maps IN_PROGRESS → PROCESSING', () => {
      expect(uploadStepStatus(UPLOAD_QUEUE_STATUS.IN_PROGRESS)).toBe(WORKFLOW_STEP_STATUS.PROCESSING)
    })

    it('maps FAILED → FAILED', () => {
      expect(uploadStepStatus(UPLOAD_QUEUE_STATUS.FAILED)).toBe(WORKFLOW_STEP_STATUS.FAILED)
    })

    it('maps INTERRUPTED → FAILED (job can never finish)', () => {
      expect(uploadStepStatus(UPLOAD_QUEUE_STATUS.INTERRUPTED)).toBe(WORKFLOW_STEP_STATUS.FAILED)
    })

    it('maps QUEUED → PENDING', () => {
      expect(uploadStepStatus(UPLOAD_QUEUE_STATUS.QUEUED)).toBe(WORKFLOW_STEP_STATUS.PENDING)
    })
  })

  describe('the colliding value', () => {
    // 'failed' is literally the same string in both enums. Documents that the
    // collision is intentional and resolves the same way either way.
    it('resolves the shared literal to FAILED regardless of source vocabulary', () => {
      expect(UPLOAD_STATUS.FAILED).toBe(UPLOAD_QUEUE_STATUS.FAILED)
      expect(uploadStepStatus('failed')).toBe(WORKFLOW_STEP_STATUS.FAILED)
    })
  })

  describe('unknown input', () => {
    it('falls back to PENDING', () => {
      expect(uploadStepStatus(undefined)).toBe(WORKFLOW_STEP_STATUS.PENDING)
      expect(uploadStepStatus(null)).toBe(WORKFLOW_STEP_STATUS.PENDING)
      expect(uploadStepStatus('nonsense')).toBe(WORKFLOW_STEP_STATUS.PENDING)
    })
  })
})
