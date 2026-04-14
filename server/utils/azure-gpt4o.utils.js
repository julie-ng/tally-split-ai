import { analyzeAnnotations } from './azure-gpt4o/analyze-annotations.js'
import { normalizeReceipt } from './azure-gpt4o/normalize-receipt.js'
import { adjustSplit } from './azure-gpt4o/adjust-split.js'

export const gpt4oUtils = {
  analyzeAnnotations,
  normalizeReceipt,
  adjustSplit,
}
