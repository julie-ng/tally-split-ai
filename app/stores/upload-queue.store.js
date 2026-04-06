import { defineStore, skipHydrate } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

export const useUploadQueueStore = defineStore('upload-queue', () => {
  // -------- STATE --------
  const MAX_CONCURRENT_UPLOADS = 3

  /**
   * Persist uploads to localStorage
   *
   * Note: Custom serializer required because File objects cannot be serialized to JSON.
   * On save: File objects are stripped before storing
   * On load: File property is set to null (can't restore files after page refresh)
   */
  const uploads = useLocalStorage('ai-receipts:upload-queue', [], {
    serializer: {
      read: (v) => {
        try {
          const parsed = JSON.parse(v)
          // Remove File objects on deserialization (can't be restored)
          return parsed.map(upload => ({
            ...upload,
            file: null,
          }))
        }
        catch {
          return []
        }
      },
      write: (v) => {
        // Remove File objects before serialization (can't be stored)
        const serializable = v.map((upload) => {
          /* eslint-disable-next-line no-unused-vars */
          const { file, ...rest } = upload
          return rest
        })
        return JSON.stringify(serializable)
      },
    },
  })

  const autoUploadTimer = ref(null)
  const AUTO_UPLOAD_INTERVAL = 1000 // 10 seconds
  const autoUploadFromQueue = ref(false)

  // Handle page refresh - mark queued/in-progress uploads as interrupted
  if (import.meta.client) {
    onMounted(() => {
      if (performance.getEntriesByType('navigation')[0]?.type === 'reload') {
        console.log('🔄 Page was refreshed - marking active uploads as interrupted')
        uploads.value.forEach((upload) => {
          if (upload.status === 'queued' || upload.status === 'in-progress') {
            upload.status = 'interrupted'
          }
        })
      }
    })
  }

  // -------- GETTERS --------

  const totalItems = computed(() => uploads.value.length)
  const hasItems = computed(() => uploads.value.length > 0)

  // Optimized: compute once, use many times
  const byStatus = computed(() => {
    const groups = { queued: [], inProgress: [], completed: [], failed: [], interrupted: [] }
    uploads.value.forEach((upload) => {
      if (upload.status === 'queued') groups.queued.push(upload)
      else if (upload.status === 'in-progress') groups.inProgress.push(upload)
      else if (upload.status === 'completed') groups.completed.push(upload)
      else if (upload.status === 'failed') groups.failed.push(upload)
      else if (upload.status === 'interrupted') groups.interrupted.push(upload)
    })
    return groups
  })

  /**
   * Queued - Status Getters
   */
  const queued = computed(() => byStatus.value.queued)
  const hasQueued = computed(() => byStatus.value.queued.length > 0)
  const totalQueued = computed(() => byStatus.value.queued.length)

  /**
   * In Progress - Status Getters
   */
  const inProgress = computed(() => byStatus.value.inProgress)
  const hasInProgress = computed(() => byStatus.value.inProgress.length > 0)
  const totalInProgress = computed(() => byStatus.value.inProgress.length)

  /**
   * Completed - Status Getters
   */
  const completed = computed(() => byStatus.value.completed)
  const hasCompleted = computed(() => byStatus.value.completed.length > 0)
  const totalCompleted = computed(() => byStatus.value.completed.length)

  /**
   * Failed - Status Getters
   */
  const failed = computed(() => byStatus.value.failed)
  const hasFailed = computed(() => byStatus.value.failed.length > 0)
  const totalFailed = computed(() => byStatus.value.failed.length)

  /**
   * Interrupted - Status Getters
   */
  const interrupted = computed(() => byStatus.value.interrupted)
  const hasInterrupted = computed(() => byStatus.value.interrupted.length > 0)
  const totalInterrupted = computed(() => byStatus.value.interrupted.length)

  /**
   * Concurrent Upload Limits
   */
  const availableSlots = computed(() =>
    MAX_CONCURRENT_UPLOADS - totalInProgress.value,
  )

  const canStartUpload = computed(() => availableSlots.value > 0)

  // -------- ACTIONS --------

  /**
   * Generate a thumbnail from a file using Canvas API
   *
   * @param {File} file - The original image file
   * @param {number} maxWidth - Maximum width in pixels (default: 100)
   * @returns {Promise<Blob>} Thumbnail as a Blob
   */
  function generateThumbnail (file, maxWidth = 100) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      img.onload = () => {
        // Calculate dimensions maintaining aspect ratio
        const scale = maxWidth / img.width
        canvas.width = maxWidth
        canvas.height = img.height * scale

        // Draw resized image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Convert to blob with quality adjustment for size
        canvas.toBlob(
          (blob) => {
            if (blob.size > 30000) {
              // If still too large, reduce quality
              canvas.toBlob(
                blob => resolve(blob),
                'image/jpeg',
                0.7, // Lower quality
              )
            }
            else {
              resolve(blob)
            }
          },
          'image/jpeg',
          0.85, // Initial quality
        )
      }

      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Upload thumbnail to Azure Blob Storage
   *
   * @param {Blob} thumbnailBlob - The thumbnail blob to upload
   * @param {string} blobName - The blob name (path) for the thumbnail
   * @returns {Promise<boolean>} True if upload succeeded
   */
  async function uploadThumbnailToAzure (thumbnailBlob, blobName) {
    try {
      // Get SAS token for thumbnail upload
      const tokenResponse = await $fetch('/api/tokens/upload', {
        method: 'POST',
        body: {
          action: 'create',
          blobName,
        },
      })

      // Upload thumbnail using XHR
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log(`✅ Thumbnail upload complete: ${blobName}`)
            resolve(true)
          }
          else {
            console.error(`❌ Thumbnail upload failed: ${xhr.status} ${xhr.statusText}`)
            reject(new Error(`Thumbnail upload failed: ${xhr.status}`))
          }
        })

        xhr.addEventListener('error', () => {
          console.error('❌ Thumbnail upload failed due to network error')
          reject(new Error('Thumbnail upload network error'))
        })

        xhr.open('PUT', tokenResponse.upload.url)
        xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob')
        xhr.setRequestHeader('Content-Type', 'image/jpeg')

        console.log(`🚀 Starting thumbnail upload: ${blobName}`)
        xhr.send(thumbnailBlob)
      })
    }
    catch (error) {
      console.error('❌ Failed to upload thumbnail:', error)
      throw error
    }
  }

  /**
   * Get the name of an upload by its hash ID
   *
   * @param {string} hashId - The unique hash identifier for the upload
   * @returns {string} The name of the upload
   */
  function getName (hashId) {
    console.log(`🍍 getName(${hashId})`)
    const upload = uploads.value.find(u => u.hashId === hashId)
    return upload.name
  }

  /**
   * Add a new upload to the queue
   *
   * @param {Object} uploadObj - The upload object containing file and metadata
   * @param {File} uploadObj.file - The file to upload (must be instanceof File)
   * @param {string} uploadObj.hashId - Unique hash identifier
   * @param {string} uploadObj.originalFilename - Original filename
   * @throws {Error} If uploadObj.file is not an instance of File
   */
  async function add (uploadObj) {
    console.log(`🍍 [Add] (${uploadObj.hashId}) ${uploadObj.originalFilename}`)
    if (!(uploadObj.file instanceof File)) {
      throw new Error('Upload must have `file` attribute of type `File`')
    }
    uploads.value.push(uploadObj)

    // Process queue to start uploads respecting concurrency limits
    processQueue()
  }

  /**
   * Generate and upload a thumbnail for the given upload object
   *
   * @param {Object} uploadObj - The upload object
   * @returns {Promise<void>}
   */
  async function generateAndUploadThumbnail (uploadObj) {
    try {
      console.log(`🖼️  Generating thumbnail for ${uploadObj.originalFilename}`)

      // Generate thumbnail blob
      const thumbnailBlob = await generateThumbnail(uploadObj.file)

      console.log(`📏 Thumbnail size: ${(thumbnailBlob.size / 1024).toFixed(2)}KB`)

      // Create thumbnail filename
      const thumbnailFilename = createThumbnailFilename(uploadObj.azureFilename)

      // Construct blob path with userId directory
      const thumbnailBlobPath = `${uploadObj.blobPath}/${thumbnailFilename}`

      // Upload thumbnail to Azure
      await uploadThumbnailToAzure(thumbnailBlob, thumbnailBlobPath)

      console.log(`✅ Thumbnail uploaded successfully: ${thumbnailFilename}`)
    }
    catch (error) {
      console.error(`❌ Thumbnail generation/upload failed:`, error)
      throw error
    }
  }

  /**
   * Remove an upload from the queue by its hash ID
   *
   * @param {string} hashId - The unique hash identifier for the upload to remove
   */
  function remove (hashId) {
    console.log(`🍍 [Remove] (${hashId})`)
    const index = uploads.value.findIndex(u => u.hashId === hashId)
    if (index !== -1) {
      uploads.value.splice(index, 1)
    }
    else {
      console.error(`Cannot find ${hashId}.`)
    }
  }

  /**
   * Return an upload back to the queued status
   *
   * @param {string} hashId - The unique hash identifier for the upload
   */
  function returnToQueue (hashId) {
    const index = uploads.value.findIndex(u => u.hashId === hashId)
    if (index !== -1) {
      uploads.value[index].status = 'queued'
    }
    else {
      console.error(`Cannot find ${hashId}.`)
    }
  }

  /**
   * Remove all uploads with 'queued' status from the queue
   */
  function emptyQueue () {
    console.log('🍍 [Empty Queue]')
    uploads.value = uploads.value.filter(u => u.status !== 'queued')
  }

  /**
   * Remove all uploads from the queue
   */
  async function removeAll () {
    console.log('🍍‼️ [Remove All]')
    // uploads.value = [] // breaks reactivity
    const total = uploads.value.length
    uploads.value.splice(0, total)
  }

  /**
   * Upload a file to Azure Blob Storage with progress tracking
   *
   * @param {string} hashId - The unique hash identifier for the upload
   * @returns {Promise<boolean>} True if upload succeeded, false otherwise
   */
  function uploadToAzure (hashId) {
    return new Promise((resolve, reject) => {
      const index = uploads.value.findIndex(u => u.hashId === hashId)

      if (index === -1) {
        console.error(`Cannot find upload ${hashId}`)
        reject(new Error(`Upload ${hashId} not found`))
        return
      }

      const upload = uploads.value[index]
      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', (evt) => {
        if (evt.lengthComputable) {
          const percentComplete = Math.round((evt.loaded / evt.total) * 100)
          uploads.value[index].upload.progress = percentComplete
          console.log(`📊 Upload progress (${hashId}): ${percentComplete}%`)
        }
      })

      // Handle successful upload
      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log(`✅ Upload complete (${hashId})`)
          uploads.value[index].status = 'completed'
          uploads.value[index].upload.progress = 100

          // Update database record
          try {
            await $fetch(`/api/uploads/${hashId}`, {
              method: 'PUT',
              body: {
                contentType: upload.file.type || 'application/octet-stream',
                size: upload.file.size,
                status: 'uploaded',
                uploadedAt: new Date().toISOString(),
                azureTags: upload.azureTags,
                title: extractReceiptTitle(upload.originalFilename),
              },
            })
            console.log(`💾 Database updated for (${hashId})`)
          }
          catch (error) {
            console.error(`❌ Failed to update database for (${hashId}):`, error)
            // Don't fail the upload if database update fails
          }

          resolve(true)
        }
        else {
          const errorMsg = `Upload failed: ${xhr.status} ${xhr.statusText}`
          console.error(`❌ ${errorMsg} (${hashId})`)
          uploads.value[index].status = 'failed'
          uploads.value[index].errors.push(errorMsg)
          reject(new Error(errorMsg))
        }
      })

      // Handle upload errors
      xhr.addEventListener('error', () => {
        const errorMsg = 'Upload failed due to network error'
        console.error(`❌ ${errorMsg} (${hashId})`)
        uploads.value[index].status = 'failed'
        uploads.value[index].errors.push(errorMsg)
        reject(new Error(errorMsg))
      })

      // Handle upload abort
      xhr.addEventListener('abort', () => {
        console.warn(`⚠️ Upload aborted (${hashId})`)
        uploads.value[index].status = 'queued'
        uploads.value[index].upload.progress = 0
        uploads.value[index].errors = []
        reject(new Error('Upload aborted'))
      })

      // Configure and send the request
      xhr.open('PUT', upload.upload.url)
      xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob')
      xhr.setRequestHeader('Content-Type', upload.file.type || 'application/octet-stream')

      // Set Azure blob index tags if available
      if (upload.azureTags && Object.keys(upload.azureTags).length > 0) {
        // Encode tag values to preserve special characters (+ becomes %2B, space becomes +)
        const tagPairs = Object.entries(upload.azureTags).map(([key, value]) => {
          const encodedValue = encodeURIComponent(value).replace(/%20/g, '+')
          return `${key}=${encodedValue}`
        })
        const tagsHeader = tagPairs.join('&')
        xhr.setRequestHeader('x-ms-tags', tagsHeader)
        console.log(`🏷️  Setting tags for (${hashId}): ${tagsHeader}`)
      }

      console.log(`🚀 Starting upload (${hashId}): ${upload.originalFilename}`)
      xhr.send(upload.file)
    })
  }

  /**
   * Start uploading a file to Azure (checks concurrency limit, updates status, and uploads)
   *
   * @param {string} hashId - The unique hash identifier for the upload
   * @returns {Promise<boolean>} True if upload started and succeeded, false if limit reached or failed
   */
  async function startUpload (hashId) {
    // Check concurrent upload limit
    if (!canStartUpload.value) {
      console.warn(`⚠️ Max concurrent uploads (${MAX_CONCURRENT_UPLOADS}) reached`)
      return false
    }

    // Find the upload
    const index = uploads.value.findIndex(u => u.hashId === hashId)
    if (index === -1) {
      console.error(`Cannot find ${hashId}.`)
      return false
    }

    // Mark as in-progress
    uploads.value[index].status = 'in-progress'

    // Generate and upload thumbnail in the background (don't block main upload)
    const uploadObj = uploads.value[index]
    generateAndUploadThumbnail(uploadObj).catch((error) => {
      console.error(`Failed to generate/upload thumbnail for ${hashId}:`, error)
      // Don't fail the main upload if thumbnail fails
    })

    // Upload to Azure
    try {
      await uploadToAzure(hashId)
      return true
    }
    catch (error) {
      console.error(`Upload failed for ${hashId}:`, error)
      return false
    }
  }

  /**
   * Retry a failed upload (increments retry counter and restarts upload)
   *
   * @param {string} hashId - The unique hash identifier for the upload to retry
   * @returns {Promise<boolean>} True if retry succeeded, false otherwise
   */
  async function retryUpload (hashId) {
    const index = uploads.value.findIndex(u => u.hashId === hashId)

    if (index === -1) {
      console.error(`Cannot find upload ${hashId}`)
      return false
    }

    // Increment retry counter
    uploads.value[index].upload.retries += 1

    // Reset progress
    uploads.value[index].upload.progress = 0

    console.log(`🔄 Retrying upload (${hashId}), attempt #${uploads.value[index].upload.retries}`)

    // Start the upload
    return await startUpload(hashId)
  }

  /**
   * Process the upload queue - starts uploads for queued items if slots are available
   * Called automatically by the timer every 30 seconds
   */
  async function processQueue () {
    console.log('⏰ [Auto-upload] Checking queue...')

    if (!autoUploadFromQueue.value) {
      console.log('⏰ [Auto-upload] Auto-upload is disabled ℹ️')
      return
    }

    if (!hasQueued.value) {
      console.log('⏰ [Auto-upload] Queue is empty')
      return
    }

    if (!canStartUpload.value) {
      console.log('⏰ [Auto-upload] No available slots')
      return
    }

    // Start uploads for available slots
    const slotsToFill = availableSlots.value
    const itemsToUpload = queued.value.slice(0, slotsToFill)

    console.log(`⏰ [Auto-upload] Starting ${itemsToUpload.length} upload(s)`)

    for (const upload of itemsToUpload) {
      await startUpload(upload.hashId)
    }
  }

  /**
   * Start the auto-upload timer
   * Automatically processes the queue every 30 seconds
   */
  function startAutoUpload () {
    if (autoUploadTimer.value) {
      console.warn('⏰ [Auto-upload] Timer already running')
      return
    }

    console.log('⏰ [Auto-upload] Starting timer (30s interval)')
    autoUploadTimer.value = setInterval(processQueue, AUTO_UPLOAD_INTERVAL)
  }

  /**
   * Stop the auto-upload timer
   */
  function stopAutoUpload () {
    if (autoUploadTimer.value) {
      console.log('⏰ [Auto-upload] Stopping timer')
      clearInterval(autoUploadTimer.value)
      autoUploadTimer.value = null
    }
  }

  // Cleanup timer when store is disposed
  if (import.meta.client) {
    onUnmounted(() => {
      stopAutoUpload()
    })
  }

  return {
    add,
    autoUploadFromQueue,
    availableSlots,
    canStartUpload,
    completed,
    emptyQueue,
    failed,
    getName,
    hasCompleted,
    hasFailed,
    hasInProgress,
    hasInterrupted,
    hasItems,
    hasQueued,
    inProgress,
    interrupted,
    maxConcurrentUploads: MAX_CONCURRENT_UPLOADS,
    processQueue,
    queued,
    remove,
    removeAll,
    retryUpload,
    returnToQueue,
    startAutoUpload,
    startUpload,
    stopAutoUpload,
    totalCompleted,
    totalFailed,
    totalInProgress,
    totalInterrupted,
    totalItems,
    totalQueued,
    uploads: skipHydrate(uploads),
  }
})
