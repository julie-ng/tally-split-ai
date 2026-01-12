import fs from 'fs/promises'
import path from 'path'

const ANALYSIS_DIR_NAME = 'tmp'

export async function readAnalysisFile (hashId) {
  let analysisData
  let result = {
    hashId,
  }

  try {
    const filePath = path.join(process.cwd(), ANALYSIS_DIR_NAME, `${hashId}.json`)
    const fileContent = await fs.readFile(filePath, 'utf-8')
    analysisData = JSON.parse(fileContent)
    result.success = true
  }
  catch (error) {
    result.success = false

    if (error.code === 'ENOENT') {
      return {
        ...result,
        error: {
          status: 404,
          message: `Analysis file not found for upload ${hashId}. Please run analysis first.`,
        },
      }
    }

    if (error.code === 'EACCES') {
      return {
        ...result,
        error: {
          status: 403,
          message: 'Access denied. Check permissions to analysis directory.',
        },
      }
    }

    return {
      ...result,
      error: {
        status: 500,
        message: `Failed to read analysis file: ${error.message}.`,
      },
    }
  }

  return {
    ...result,
    data: analysisData,
  }
}
