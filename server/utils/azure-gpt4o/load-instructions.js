import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// Resolve trigger/instructions/ relative to this module so the path is
// stable regardless of cwd or which runtime (Nitro / Trigger worker) loads it.
const HERE = dirname(fileURLToPath(import.meta.url))
const INSTRUCTIONS_DIR = resolve(HERE, '../../../trigger/instructions')

const cache = new Map()

/**
 * Load a system prompt from trigger/instructions/<name>.md.
 * Cached after first read.
 *
 * @param {string} name - Instruction file basename without extension (e.g. 'adjust-split')
 * @returns {string} Markdown contents
 */
export function loadInstructions (name) {
  if (cache.has(name)) {
    return cache.get(name)
  }
  const path = resolve(INSTRUCTIONS_DIR, `${name}.md`)
  const text = readFileSync(path, 'utf8')
  cache.set(name, text)
  return text
}
