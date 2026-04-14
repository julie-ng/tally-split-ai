/**
 * Workflow step names
 */
export const WORKFLOW_STEP = {
  OCR: 'ocr',
  ANNOTATIONS: 'annotations',
  NORMALIZE: 'normalize',
  SPLIT: 'createSplit',
  ADJUST_SPLIT: 'adjustSplit',
  WORKFLOW: 'workflow',
}

export const WORKFLOW_STEPS = /** @type {const} */ (Object.values(WORKFLOW_STEP))
