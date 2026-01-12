import { readdir } from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  const scansPath = join(process.cwd(), 'scans', 'excerpt')

  try {
    const files = await readdir(scansPath)

    // Filter for image files only
    const imageFiles = files.filter(file =>
      /\.(jpg|jpeg|png|gif|bmp|tiff)$/i.test(file),
    )

    // Extract metadata from filenames
    const receipts = imageFiles.map(filename => ({
      filename,
      key: filenameToComponentKey(filename),
      title: extractReceiptTitle(filename),
      date: extractReceiptDate(filename),
      total: extractReceiptTotal(filename),
      tags: extractHashtags(filename),
    }))

    return {
      count: receipts.length,
      receipts,
    }
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to read scans directory',
      message: error.message,
    })
  }
})
