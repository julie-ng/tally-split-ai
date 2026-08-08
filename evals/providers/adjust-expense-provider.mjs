import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { adjustExpense } from '../../server/utils/llm/adjust-expense.js'
import { azureOcrExtract } from '../../server/utils/azure-ocr.utils.js'
import { shortIdFromCaseDir } from '../utils/case-dir.utils.mjs'

const EVALS_DIR = dirname(dirname(fileURLToPath(import.meta.url)))

// Fixed fake household (gitignored — real first names) reused across every
// case so payer-matching has a stable, consistent set of initials/names to
// match handwriting against. See evals/household.json.
const household = JSON.parse(readFileSync(resolve(EVALS_DIR, 'household.json'), 'utf8'))
const householdMembers = [household.user1, household.user2]

/**
 * Custom promptfoo provider for the adjust-expense LLM step.
 *
 * Calls the real `adjustExpense()` used in production (same seam as
 * `trigger/adjust-expense.js`) instead of reimplementing the prompt
 * assembly. Ground-truth annotations (this case's `.annotations.expected.json`)
 * are used as input rather than live-chaining `analyzeAnnotations()` output —
 * isolates total-math correctness from upstream annotation-detection errors.
 *
 * householdMembers is passed so paidBy/payerConfidence are meaningful to
 * assert on. Share allocation (asymmetric splits) is still out of scope.
 */
class AdjustExpenseProvider {
  id () {
    return 'adjust-expense'
  }

  async callApi (prompt, context) {
    const { caseDir } = context.vars
    const shortId = shortIdFromCaseDir(caseDir)
    const datasetDir = resolve(EVALS_DIR, 'datasets', caseDir)

    const ocrFixture = JSON.parse(readFileSync(resolve(datasetDir, `${shortId}.input.ocr.json`), 'utf8'))
    const { expected: annotations } = JSON.parse(readFileSync(resolve(datasetDir, `${shortId}.annotations.expected.json`), 'utf8'))

    const ocrData = azureOcrExtract.extractForLlm(ocrFixture.ocrJson)

    const result = await adjustExpense({
      ocrData,
      ocrText: ocrFixture.ocrText,
      annotations,
      householdMembers,
    })

    return {
      output: result,
    }
  }
}

export default AdjustExpenseProvider
