/**
 * Data Migration Script: Create receipts from existing uploads
 *
 * This script:
 * 1. Queries all uploads that don't have a receiptId
 * 2. Checks if Azure AI analysis exists for each upload
 * 3. Creates a receipt using Azure AI data (primary) or inferred data (fallback)
 * 4. Links the upload to the new receipt via receiptId
 *
 * Run with: node server/db/seed-receipts.js
 *
 * Requirements:
 * - Dev server must be running at http://localhost:3000
 * - Analysis JSON files should exist in ./tmp/{hashId}.json
 */

import fs from 'fs'
import path from 'path'
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, isNull } from 'drizzle-orm'
import * as schema from './schema.ts'
import {
  extractReceiptDate,
  extractReceiptTotal,
  extractHashtags,
} from '../../shared/utils/filename.utils.js'

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'
const TMP_DIR = './tmp'

// Initialize database connection
const connectionString = process.env.NUXT_DATABASE_URL
  || process.env.DATABASE_URL
  || 'postgresql://receipts:localdev@localhost:5432/ai_receipts'
const pool = new pg.Pool({ connectionString })
const db = drizzle(pool, { schema })

/**
 * Check if an analysis file exists for a given hashId
 * @param {string} hashId - The upload hashId
 * @returns {boolean} True if analysis file exists
 */
function hasAnalysisFile (hashId) {
  const filePath = path.join(TMP_DIR, `${hashId}.json`)
  return fs.existsSync(filePath)
}

/**
 * Fetch analysis summary from the API
 * @param {string} hashId - The upload hashId
 * @returns {Promise<object|null>} API response data or null on error
 */
async function fetchAnalysisSummary (hashId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analysis/summary/${hashId}`)
    if (!response.ok) {
      console.warn(`  ⚠ API returned ${response.status} for ${hashId}`)
      return null
    }
    const json = await response.json()
    if (!json.success) {
      console.warn(`  ⚠ API returned success=false for ${hashId}`)
      return null
    }
    return json.data
  }
  catch (error) {
    console.warn(`  ⚠ Failed to fetch analysis for ${hashId}: ${error.message}`)
    return null
  }
}

/**
 * Extract receipt data from Azure AI analysis response
 * @param {object} apiData - The API response data
 * @returns {object} Extracted receipt data
 */
function extractFromAzureAI (apiData) {
  const summary = apiData?.azureAI?.summary
  if (!summary) {
    return {}
  }

  const merchant = summary.merchant || {}
  const receipt = summary.receipt || {}

  return {
    merchantName: merchant.name?.value || null,
    merchantAddress: merchant.address?.formattedValue || null,
    merchantPhone: merchant.phone?.value || null,
    date: receipt.transactionDate?.value || null,
    total: receipt.total?.value?.amount || null,
    currency: receipt.total?.value?.currencyCode || null,
  }
}

/**
 * Parse azureTags JSON string and extract receipt data
 * @param {string|null} azureTagsJson - JSON string of Azure blob tags
 * @returns {object} Extracted receipt data
 */
function parseAzureTags (azureTagsJson) {
  if (!azureTagsJson) {
    return {}
  }

  try {
    const tags = JSON.parse(azureTagsJson)
    return {
      date: tags['receipt-date'] || null,
      total: tags['receipt-total'] ? parseFloat(tags['receipt-total']) : null,
      tags: tags['receipt-tags'] ? tags['receipt-tags'].replace(/\+/g, ', ') : null,
    }
  }
  catch (e) {
    console.warn('  ⚠ Failed to parse azureTags:', e.message)
    return {}
  }
}

/**
 * Extract receipt data from original filename as fallback
 * @param {string} filename - Original filename
 * @returns {object} Extracted receipt data
 */
function parseFilename (filename) {
  const hashtags = extractHashtags(filename)
  return {
    date: extractReceiptDate(filename),
    total: extractReceiptTotal(filename) ? parseFloat(extractReceiptTotal(filename)) : null,
    tags: hashtags.length > 0 ? hashtags.join(', ') : null,
  }
}

/**
 * Build notes string from inferred data
 * @param {object} inferred - Inferred data from tags/filename
 * @param {boolean} hasAnalysis - Whether Azure AI analysis was used
 * @returns {string|null} Notes string or null if no inferred data
 */
function buildNotesString (inferred, hasAnalysis) {
  const lines = []

  if (inferred.date) {
    lines.push(`- date: ${inferred.date}`)
  }
  if (inferred.total) {
    lines.push(`- total: ${inferred.total}`)
  }
  if (inferred.tags) {
    lines.push(`- tags: ${inferred.tags}`)
  }

  if (lines.length === 0) {
    return null
  }

  if (hasAnalysis) {
    return `Inferred from Filename / Azure Blob Tags:\n${lines.join('\n')}`
  }
  else {
    return `Receipt data inferred from upload filename.\n${lines.join('\n')}`
  }
}

/**
 * Main migration function
 */
async function migrateUploadsToReceipts () {
  console.log('Starting migration: Create receipts from existing uploads\n')
  console.log(`Database: ${connectionString}`)
  console.log(`API Base URL: ${API_BASE_URL}`)
  console.log(`Temp Directory: ${TMP_DIR}\n`)

  // Get all uploads without a receiptId
  const uploadsWithoutReceipts = await db
    .select()
    .from(schema.uploads)
    .where(isNull(schema.uploads.receiptId))

  console.log(`Found ${uploadsWithoutReceipts.length} uploads without receipts\n`)

  if (uploadsWithoutReceipts.length === 0) {
    console.log('Nothing to migrate. All uploads already have receipts.')
    await pool.end()
    return
  }

  let successCount = 0
  let errorCount = 0
  let withAnalysisCount = 0

  for (const upload of uploadsWithoutReceipts) {
    try {
      console.log(`Processing: ${upload.originalFilename}`)

      // Check if analysis file exists
      const analysisExists = hasAnalysisFile(upload.hashId)
      let fromAzureAI = {}

      if (analysisExists) {
        console.log(`  → Analysis file found, fetching summary...`)
        const apiData = await fetchAnalysisSummary(upload.hashId)
        if (apiData) {
          fromAzureAI = extractFromAzureAI(apiData)
          withAnalysisCount++
        }
      }
      else {
        console.log(`  → No analysis file found`)
      }

      // Extract inferred data from azureTags and filename
      const fromTags = parseAzureTags(upload.azureTags)
      const fromFilename = parseFilename(upload.originalFilename)

      // Merge inferred data (tags take priority over filename)
      const inferred = {
        date: fromTags.date || fromFilename.date,
        total: fromTags.total || fromFilename.total,
        tags: fromTags.tags || fromFilename.tags,
      }

      // Build notes string
      const hasAnalysis = Object.keys(fromAzureAI).some(k => fromAzureAI[k] !== null)
      const notes = buildNotesString(inferred, hasAnalysis)

      // Build final receipt data (Azure AI takes priority)
      const receiptData = {
        merchantName: fromAzureAI.merchantName || null,
        merchantAddress: fromAzureAI.merchantAddress || null,
        merchantPhone: fromAzureAI.merchantPhone || null,
        date: fromAzureAI.date || inferred.date,
        total: fromAzureAI.total || inferred.total,
        tags: inferred.tags, // Tags only come from inferred
        currency: fromAzureAI.currency || 'EUR',
        notes: notes,
        userId: upload.userId,
        isAnalyzed: hasAnalysis,
      }

      // Create the receipt
      const [newReceipt] = await db
        .insert(schema.receipts)
        .values(receiptData)
        .returning()

      // Link the upload to the receipt
      await db
        .update(schema.uploads)
        .set({ receiptId: newReceipt.id })
        .where(eq(schema.uploads.id, upload.id))

      console.log(`  ✓ Created Receipt #${newReceipt.id}`)
      successCount++
    }
    catch (error) {
      console.error(`  ✗ Error: ${error.message}`)
      errorCount++
    }
  }

  console.log('\n--- Migration Summary ---')
  console.log(`Successful: ${successCount}`)
  console.log(`  - With Azure AI analysis: ${withAnalysisCount}`)
  console.log(`  - Inferred only: ${successCount - withAnalysisCount}`)
  console.log(`Errors: ${errorCount}`)
  console.log(`Total processed: ${uploadsWithoutReceipts.length}`)

  await pool.end()
}

// Run the migration
migrateUploadsToReceipts().catch((error) => {
  console.error('Migration failed:', error)
  await pool.end()
  process.exit(1)
})
