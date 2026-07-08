import { analyzeAnnotations } from './llm/analyze-annotations.js'
import { normalizeReceipt } from './llm/normalize-receipt.js'
import { adjustExpense } from './llm/adjust-expense.js'
import { slimAnnotationsResponse } from './llm/slim-annotations-response.js'

export const llmUtils = {
  analyzeAnnotations,
  normalizeReceipt,
  adjustExpense,
  slimAnnotationsResponse,
}
