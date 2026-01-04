import fs from 'fs/promises'
import path from 'path'

export default defineEventHandler(async (event) => {
  const hashId = getRouterParam(event, 'hashId')

  if (!hashId) {
    setResponseStatus(event, 400)
    return { error: 'Hash ID is required' }
  }

  const filePath = path.join(process.cwd(), 'tmp', `${hashId}.json`)
  console.log('filePath', filePath)

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const jsonData = JSON.parse(fileContent)

    return {
      success: true,
      data: jsonData
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      setResponseStatus(event, 404)
      return {
        success: false,
        error: 'Analysis file not found'
      }
    }

    setResponseStatus(event, 500)
    return {
      success: false,
      error: 'Failed to read analysis file'
    }
  }
})
