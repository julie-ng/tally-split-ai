/**
 * Takes JSON string (how they are stored in DB)
 * and returns array of key-value objects for output
 *
 * @returns Array
 */

function blobTagsJsonToObject (jsonString) {
  if (!jsonString) return [] // shouldn't this be an object?
  const data = JSON.parse(jsonString)
  return Object.entries(data).map(([key, value]) => ({ key, value }))
}

function getReceiptTotalBlobTag (jsonString) {
  const tagsObject = blobTagsJsonToObject(jsonString)
  const total = tagsObject.find(tag => tag.key === 'receipt-total')
  return total
    ? total.value
    : null
}

export const azureUtils = {
  blobTagsJsonToObject,
  getReceiptTotalBlobTag,
}
