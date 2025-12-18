import { readdir } from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  const scansPath = join(process.cwd(), '..', 'scans', 'excerpt')

  try {
    const files = await readdir(scansPath)

    // Filter for image files only
    const imageFiles = files.filter(file =>
      /\.(jpg|jpeg|png|gif|bmp|tiff)$/i.test(file)
    )

    return {
      count: imageFiles.length,
      files: imageFiles
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to read scans directory',
      message: error.message
    })
  }
})
