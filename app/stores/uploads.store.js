import { defineStore } from 'pinia'

export const useUploadsStore = defineStore('uploads', () => {

  // -------- STATE --------

  const MAX_CONCURRENT_UPLOADS = 3
  const uploads = ref([])

  // -------- GETTERS --------

  const totalItems = computed(() => uploads.value.length)
  const hasItems = computed(() => uploads.value.length > 0)

  // Optimized: compute once, use many times
  const byStatus = computed(() => {
    const groups = { queued: [], inProgress: [], completed: [], failed: [] }
    uploads.value.forEach(upload => {
      if (upload.status === 'queued') groups.queued.push(upload)
      else if (upload.status === 'in-progress') groups.inProgress.push(upload)
      else if (upload.status === 'completed') groups.completed.push(upload)
      else if (upload.status === 'failed') groups.failed.push(upload)
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
   * Concurrent Upload Limits
   */
  const availableSlots = computed(() =>
    MAX_CONCURRENT_UPLOADS - totalInProgress.value
  )

  const canStartUpload = computed(() => availableSlots.value > 0)

  // -------- ACTIONS --------

  /**
   * Get the name of an upload by its hash ID
   *
   * @param {string} hashId - The unique hash identifier for the upload
   * @returns {string} The name of the upload
   */
  function getName(hashId) {
    console.log(`🍍 getName(${hashId})`)
    const upload = uploads.value.find((u) => u.hashId === hashId)
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
  function add(uploadObj) {
    console.log(`🍍 [Add] (${uploadObj.hashId}) ${uploadObj.originalFilename}`)
    if (!(uploadObj.file instanceof File)) {
      throw new Error('Upload must have `file` attribute of type `File`')
    }
    uploads.value.push(uploadObj)
  }

  /**
   * Remove an upload from the queue by its hash ID
   *
   * @param {string} hashId - The unique hash identifier for the upload to remove
   */
  function remove(hashId) {
    console.log(`🍍 [Remove] (${hashId})`)
    const index = uploads.value.findIndex((u) => u.hashId === hashId)
    if (index !== -1) {
      uploads.value.splice(index, 1)
    } else {
      console.error(`Cannot find ${hashId}.`)
    }
  }

  /**
   * Return an upload back to the queued status
   *
   * @param {string} hashId - The unique hash identifier for the upload
   */
  function returnToQueue(hashId) {
    const index = uploads.value.findIndex((u) => u.hashId === hashId)
    if (index !== -1) {
      uploads.value[index].status = 'queued'
    } else {
      console.error(`Cannot find ${hashId}.`)
    }
  }

  /**
   * Remove all uploads with 'queued' status from the queue
   */
  function emptyQueue() {
    console.log('🍍 [Empty Queue]')
    uploads.value = uploads.value.filter((u) => u.status !== 'queued')
  }

  /**
   * Remove all uploads from the queue
   */
  async function removeAll() {
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
  function uploadToAzure(hashId) {
    return new Promise((resolve, reject) => {
      const index = uploads.value.findIndex((u) => u.hashId === hashId)

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
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log(`✅ Upload complete (${hashId})`)
          uploads.value[index].status = 'completed'
          uploads.value[index].upload.progress = 100
          resolve(true)
        } else {
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
  async function startUpload(hashId) {
    // Check concurrent upload limit
    if (!canStartUpload.value) {
      console.warn(`⚠️ Max concurrent uploads (${MAX_CONCURRENT_UPLOADS}) reached`)
      return false
    }

    // Find the upload
    const index = uploads.value.findIndex((u) => u.hashId === hashId)
    if (index === -1) {
      console.error(`Cannot find ${hashId}.`)
      return false
    }

    // Mark as in-progress
    uploads.value[index].status = 'in-progress'

    // Upload to Azure
    try {
      await uploadToAzure(hashId)
      return true
    } catch (error) {
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
  async function retryUpload(hashId) {
    const index = uploads.value.findIndex((u) => u.hashId === hashId)

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

  return {
    add,
    availableSlots,
    canStartUpload,
    completed,
    emptyQueue,
    failed,
    getName,
    hasCompleted,
    hasFailed,
    hasInProgress,
    hasItems,
    hasQueued,
    inProgress,
    maxConcurrentUploads: MAX_CONCURRENT_UPLOADS,
    queued,
    remove,
    removeAll,
    retryUpload,
    returnToQueue,
    startUpload,
    totalCompleted,
    totalFailed,
    totalInProgress,
    totalItems,
    totalQueued,
    uploads
  }
})
