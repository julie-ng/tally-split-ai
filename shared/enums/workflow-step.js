/**
 * Workflow step names
 */
export const WORKFLOW_STEP = {
  OCR: 'ocr',
  ANNOTATIONS: 'annotations',
  SPLIT: 'split',
  WORKFLOW: 'workflow',
}

export const WORKFLOW_STEPS = /** @type {const} */ (Object.values(WORKFLOW_STEP))
