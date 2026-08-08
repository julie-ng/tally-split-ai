import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { shortIdFromCaseDir } from '../utils/case-dir.utils.mjs'

const EVALS_DIR = dirname(dirname(fileURLToPath(import.meta.url)))

// 1 cent tolerance, matching resolveShares' own reconciliation tolerance.
const TOLERANCE = 0.01

/**
 * Checks originalTotal/adjustedTotal against the case's
 * `{shortid}.adjusted-totals.expected.json`. Payer/shares are not asserted —
 * out of scope for this eval (see evals/providers/adjust-expense-provider.mjs).
 */
export default function adjustedTotalsMatchExpected (output, { vars }) {
  const { caseDir } = vars
  const shortId = shortIdFromCaseDir(caseDir)
  const expectedPath = resolve(EVALS_DIR, 'datasets', caseDir, `${shortId}.adjusted-totals.expected.json`)
  const { expected } = JSON.parse(readFileSync(expectedPath, 'utf8'))

  for (const key of ['originalTotal', 'adjustedTotal']) {
    const want = expected[key]
    const got = output[key]

    if (want === null) {
      if (got !== null) {
        return { pass: false, score: 0, reason: `Expected "${key}" to be null, got ${JSON.stringify(got)}` }
      }
      continue
    }

    if (typeof got !== 'number' || Math.abs(got - want) > TOLERANCE) {
      return { pass: false, score: 0, reason: `"${key}" mismatch: expected ${want}, got ${JSON.stringify(got)}` }
    }
  }

  return { pass: true, score: 1, reason: 'Adjusted totals match expected' }
}
