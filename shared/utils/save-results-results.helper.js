import { writeFile } from 'fs/promises'
import chalk from 'chalk'

/**
 * Save upload results to a JSON file
 * @param {Object} options - Upload results data
 * @param {string} options.accountName - Azure storage account name
 * @param {string} options.containerName - Container name
 * @param {string} options.sasToken - SAS token for container access
 * @param {number} options.successCount - Number of successful uploads
 * @param {number} options.errorCount - Number of failed uploads
 * @param {number} options.totalCount - Total number of files
 * @param {Array} options.uploadedBlobs - Array of uploaded blob objects
 * @param {string} [options.outputFile='upload-results.json'] - Output file path
 */
export async function saveUploadResults ({
  accountName,
  containerName,
  sasToken,
  successCount,
  errorCount,
  totalCount,
  uploadedBlobs,
  outputFile = 'upload-results.json',
}) {
  const results = {
    accountName,
    containerName,
    sasToken,
    uploadedAt: new Date().toISOString(),
    summary: {
      successful: successCount,
      failed: errorCount,
      total: totalCount,
    },
    blobs: uploadedBlobs.map(blob => ({
      filename: blob.filename,
      tags: blob.tags,
      url: blob.url,
      urlWithSas: sasToken ? `${blob.url}?${sasToken}` : null,
    })),
  }

  try {
    await writeFile(outputFile, JSON.stringify(results, null, 2))
    console.log(`\n${chalk.green('✓')} Upload results saved to ${outputFile}`)
  }
  catch (error) {
    console.error(`${chalk.red('Failed to save upload results:')} ${error.message}`)
  }
}
