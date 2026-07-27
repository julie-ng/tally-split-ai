import { describe, it, expect } from 'vitest'
import { WORKFLOW_STEP, WORKFLOW_STEP_REGISTRY, WORKFLOW_STEP_KEYS } from './workflow-step.js'

// The registry drives column-name derivation across status.put.js, the workflow
// store, the zod schemas and two components. A drift between a registry key and
// the real workflow_runs column would fail silently (undefined, not a throw), so
// the derived names are asserted literally here.
describe('WORKFLOW_STEP_REGISTRY', () => {
  it('lists the five real pipeline steps in execution order', () => {
    expect(WORKFLOW_STEP_KEYS).toEqual([
      'ocr',
      'annotations',
      'normalize',
      'createExpense',
      'adjustExpense',
    ])
  })

  it('excludes ORCHESTRATOR — it is run-level, not a step', () => {
    expect(WORKFLOW_STEP_KEYS).not.toContain(WORKFLOW_STEP.ORCHESTRATOR)
  })

  it('keys off enum VALUES, not enum key names', () => {
    // The trap: WORKFLOW_STEP.EXPENSE is 'createExpense'. Deriving from the enum
    // KEY would give 'expenseStatus' — a column that does not exist.
    expect(WORKFLOW_STEP_KEYS).toContain('createExpense')
    expect(WORKFLOW_STEP_KEYS).not.toContain('EXPENSE')
    expect(WORKFLOW_STEP_KEYS).not.toContain('expense')
  })

  it('every key is a WORKFLOW_STEP value', () => {
    const values = Object.values(WORKFLOW_STEP)
    for (const key of WORKFLOW_STEP_KEYS) {
      expect(values).toContain(key)
    }
  })

  it('derives the camelCase status fields the store/zod use', () => {
    expect(WORKFLOW_STEP_KEYS.map(k => `${k}Status`)).toEqual([
      'ocrStatus',
      'annotationsStatus',
      'normalizeStatus',
      'createExpenseStatus',
      'adjustExpenseStatus',
    ])
  })

  it('derives the snake_case DB columns for realtime payload mapping', () => {
    const toSnake = key => key.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)
    expect(WORKFLOW_STEP_KEYS.map(k => `${toSnake(k)}_status`)).toEqual([
      'ocr_status',
      'annotations_status',
      'normalize_status',
      'create_expense_status',
      'adjust_expense_status',
    ])
    expect(WORKFLOW_STEP_KEYS.map(k => `${toSnake(k)}_started_at`)).toEqual([
      'ocr_started_at',
      'annotations_started_at',
      'normalize_started_at',
      'create_expense_started_at',
      'adjust_expense_started_at',
    ])
  })

  it('gives every step both labels and a description', () => {
    for (const step of WORKFLOW_STEP_REGISTRY) {
      expect(step.label).toBeTruthy()
      expect(step.timelineLabel).toBeTruthy()
      expect(step.description).toBeTruthy()
    }
  })
})
