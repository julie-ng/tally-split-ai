import { analyzeAnnotations } from './azure-gpt4o/analyze-annotations.js'
import { normalizeReceipt } from './azure-gpt4o/normalize-receipt.js'
import { adjustExpense } from './azure-gpt4o/adjust-expense.js'

export const gpt4oUtils = {
  analyzeAnnotations,
  normalizeReceipt,
  adjustExpense,
}
