import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { shortIdFromCaseDir } from '../utils/case-dir.utils.mjs'

const EVALS_DIR = dirname(dirname(fileURLToPath(import.meta.url)))

/**
 * Checks paidBy against the case's `{shortid}.payer.expected.json`.
 * Totals/shares are not asserted — see
 * evals/assertions/adjusted-totals-match-expected.mjs for that.
 */
export default function payerMatchesExpected (output, { vars }) {
  const { caseDir } = vars
  const shortId = shortIdFromCaseDir(caseDir)
  const expectedPath = resolve(EVALS_DIR, 'datasets', caseDir, `${shortId}.payer.expected.json`)
  const { expected } = JSON.parse(readFileSync(expectedPath, 'utf8'))

  if (output.paidBy !== expected.paidBy) {
    return {
      pass: false,
      score: 0,
      reason: `"paidBy" mismatch: expected ${JSON.stringify(expected.paidBy)}, got ${JSON.stringify(output.paidBy)}`,
    }
  }

  return { pass: true, score: 1, reason: 'Payer matches expected' }
}
