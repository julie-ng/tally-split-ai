/**
 * Extract the short ID from a dataset case's folder name.
 * Folder names are `{shortId}-descriptive-suffix` for readability in the
 * promptfoo UI; files inside keep the bare shortId (e.g. `{shortId}.jpg`).
 *
 * @param {string} caseDir - e.g. 'vfpmdwas-two-circles-of-three-items-last4cc'
 * @returns {string} the short ID alone, e.g. 'vfpmdwas'
 */
export function shortIdFromCaseDir (caseDir) {
  return caseDir.split('-')[0]
}
