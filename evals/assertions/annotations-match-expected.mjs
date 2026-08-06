import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const EVALS_DIR = dirname(dirname(fileURLToPath(import.meta.url)))

/**
 * Strict deep-equality check against the case's `{shortid}.expected.json`.
 * Ignores array order — the prompt does not promise a stable ordering of
 * annotations, only that every mark is reported once.
 */
export default function annotationsMatchExpected (output, { vars }) {
  const { caseDir } = vars
  const expectedPath = resolve(EVALS_DIR, 'dataset', caseDir, `${caseDir}.expected.json`)
  const { expected } = JSON.parse(readFileSync(expectedPath, 'utf8'))

  const actual = output.annotations ?? []
  const wanted = expected.annotations ?? []

  if (actual.length !== wanted.length) {
    return {
      pass: false,
      score: 0,
      reason: `Expected ${wanted.length} annotation(s), got ${actual.length}`,
    }
  }

  const sortKey = a => `${a.lineItemIndex}|${a.item}|${a.type}|${a.value}`
  const sortedActual = [...actual].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
  const sortedWanted = [...wanted].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))

  for (let i = 0; i < sortedWanted.length; i++) {
    const want = sortedWanted[i]
    const got = sortedActual[i]

    for (const key of ['lineItemIndex', 'item', 'type', 'value']) {
      if (got[key] !== want[key]) {
        return {
          pass: false,
          score: 0,
          reason: `Annotation mismatch on "${key}": expected ${JSON.stringify(want[key])}, got ${JSON.stringify(got[key])} (item: ${want.item})`,
        }
      }
    }
  }

  return { pass: true, score: 1, reason: 'Annotations match expected' }
}
