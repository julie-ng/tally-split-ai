import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { config } from 'dotenv';
import { readdir } from 'fs/promises';
// import { createReadStream } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { extractReceiptDate, extractReceiptTotal, extractHashtags } from './filename-utils.js';

// Load environment variables
config();

const ACCOUNT_NAME = process.env.AZ_STORAGE_ACCOUNT;
const ACCOUNT_KEY = process.env.AZ_STORAGE_ACCOUNT_KEY;
const CONTAINER_NAME = 'receipts'; // Container name for receipt uploads
const SCANS_DIR = './scans/excerpt';

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
      // Extract receipt date, total, and hashtags from filename
      const receiptDate = extractReceiptDate(filename);
      const receiptTotal = extractReceiptTotal(filename);
      const hashtags = extractHashtags(filename);

      // Prepare blob index tags
      const tags = {};
      if (receiptDate) {
        tags['receipt-date'] = receiptDate;
      }
      if (receiptTotal) {
        tags['receipt-total'] = receiptTotal;
      }
      if (hashtags) {
        tags['receipt-tags'] = hashtags;
      }

      // Upload file with tags
      const uploadOptions = {
        tags: Object.keys(tags).length > 0 ? tags : undefined
      };

      await blobClient.uploadFile(filePath, uploadOptions);

      const tagsList = [];
      if (receiptDate) tagsList.push(`receipt-date: ${receiptDate}`);
      if (receiptTotal) tagsList.push(`receipt-total: ${receiptTotal}`);
      if (hashtags) tagsList.push(`receipt-tags: ${hashtags}`);
      const tagsInfo = tagsList.length > 0 ? ` ${chalk.gray(`[${tagsList.join(', ')}]`)}` : '';
      console.log(` ${chalk.bgGreen.white('Uploaded:')} ${chalk.white(filename)}${tagsInfo}`);
      successCount++;

    } catch (error) {
      console.error(` Failed to upload ${filename}: ${error.message}`);
      errorCount++;
    }
  }

  // Summary
  console.log(`\n${chalk.blue('=== Upload Summary ===')}`);
  console.log(`${chalk.green(`Successful: ${successCount}`)}`);
  if (errorCount > 0) {
    console.log(`${chalk.red(`Failed: ${errorCount}`)}`);
  } else {
    console.log(`${chalk.white(`Failed: ${errorCount}`)}`);
  }
  console.log(`Total: ${imageFiles.length}`);
}

// Run upload
uploadScans().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
