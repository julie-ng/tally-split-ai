import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { config } from 'dotenv';
import { readdir } from 'fs/promises';
import { createReadStream } from 'fs';
import { join } from 'path';

// Load environment variables
config();

const ACCOUNT_NAME = process.env.AZ_STORAGE_ACCOUNT;
const ACCOUNT_KEY = process.env.AZ_STORAGE_ACCOUNT_KEY;
const CONTAINER_NAME = 'receipts'; // Container name for receipt uploads
const SCANS_DIR = './scans';

/**
 * Extract receipt total from filename if present
 * Looks for pattern: (amount) e.g., "(21.82)" or "(115)"
 * @param {string} filename - The filename to parse
 * @returns {string|null} - The extracted amount or null
 */
function extractReceiptTotal(filename) {
  const match = filename.match(/\(([0-9.]+)\)/);
  return match ? match[1] : null;
}

/**
 * Upload all images from scans directory to Azure Blob Storage
 */
async function uploadScans() {
  // Validate environment variables
  if (!ACCOUNT_NAME || !ACCOUNT_KEY) {
    console.error('Error: Missing required environment variables');
    console.error('Required: AZ_STORAGE_ACCOUNT, AZ_STORAGE_ACCOUNT_KEY');
    process.exit(1);
  }

  // Create blob service client
  const sharedKeyCredential = new StorageSharedKeyCredential(ACCOUNT_NAME, ACCOUNT_KEY);
  const blobServiceClient = new BlobServiceClient(
    `https://${ACCOUNT_NAME}.blob.core.windows.net`,
    sharedKeyCredential
  );

  // Get or create container
  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

  try {
    await containerClient.createIfNotExists({
      access: 'blob'
    });
    console.log(`Container "${CONTAINER_NAME}" ready`);
  } catch (error) {
    console.error(`Error creating container: ${error.message}`);
    process.exit(1);
  }

  // Read all files from scans directory
  let files;
  try {
    files = await readdir(SCANS_DIR);
  } catch (error) {
    console.error(`Error reading scans directory: ${error.message}`);
    process.exit(1);
  }

  // Filter for image files
  const imageFiles = files.filter(file =>
    /\.(jpg|jpeg|png|gif|bmp|tiff)$/i.test(file)
  );

  console.log(`Found ${imageFiles.length} image file(s) to upload\n`);

  // Upload each file
  let successCount = 0;
  let errorCount = 0;

  for (const filename of imageFiles) {
    const filePath = join(SCANS_DIR, filename);
    const blobClient = containerClient.getBlockBlobClient(filename);

    try {
      // Extract receipt total from filename
      const receiptTotal = extractReceiptTotal(filename);

      // Prepare blob index tags
      const tags = {};
      if (receiptTotal) {
        tags['receipt-total'] = receiptTotal;
      }

      // Upload file with tags
      const uploadOptions = {
        tags: Object.keys(tags).length > 0 ? tags : undefined
      };

      await blobClient.uploadFile(filePath, uploadOptions);

      const tagsInfo = receiptTotal ? ` [receipt-total: ${receiptTotal}]` : '';
      console.log(` Uploaded: ${filename}${tagsInfo}`);
      successCount++;

    } catch (error) {
      console.error(` Failed to upload ${filename}: ${error.message}`);
      errorCount++;
    }
  }

  // Summary
  console.log(`\n=== Upload Summary ===`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
  console.log(`Total: ${imageFiles.length}`);
}

// Run upload
uploadScans().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
