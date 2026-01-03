/**
 * Takes JSON string (how they are stored in DB)
 * and returns array of key-value objects for output
 *
 * @returns Array
 */
function blobTagsJsonToObject(jsonString) {
  if (!jsonString) return []
  const data = JSON.parse(jsonString)
  return Object.entries(data).map(([key, value]) => ({ key, value }))
}

export const azureUtils = {
  blobTagsJsonToObject
}
