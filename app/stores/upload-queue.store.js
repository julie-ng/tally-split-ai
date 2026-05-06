import { defineStore, skipHydrate } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import { useUserStore } from '~/stores/user.store'
import { fileStripSerializer } from '~/utils/local-storage-serializer.utils'
import { uploadBlobToAzure } from '~/utils/azure-upload.utils'
import { generateThumbnail, uploadThumbnailToAzure } from '~/utils/thumbnail.utils'

export const useUploadQueueStore = defineStore('upload-queue', () => {
  // -------- STATE --------
  const {
    uploadMaxConcurrent,
    uploadAutoIntervalMs,
    uploadAutoEnabled } = useRuntimeConfig().public

  const autoUploadTimer = ref(null)
  const autoUploadFromQueue = ref(uploadAutoEnabled)

  const uploads = useLocalStorage('ai-receipts:upload-queue', [], {
    serializer: fileStripSerializer,
  })

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
    uploadMaxConcurrent - totalInProgress.value,
  )

  const canStartUpload = computed(() => availableSlots.value > 0)

  // -------- ACTIONS --------

  /**
   * Get the name of an upload by its hash ID
   *
   * @param {string} id - The unique hash identifier for the upload
   * @returns {string} The name of the upload
   */
  function getName (id) {
    console.log(`🍍 getName(${id})`)
    const upload = uploads.value.find(u => u.id === id)
    return upload.name
  }

  /**
   * Add a new upload to the queue
   *
   * @param {Object} uploadObj - The upload object containing file and metadata
   * @param {File} uploadObj.file - The file to upload (must be instanceof File)
   * @param {string} uploadObj.id - Unique hash identifier
   * @param {string} uploadObj.originalFilename - Original filename
   * @throws {Error} If uploadObj.file is not an instance of File
   */
  async function add (uploadObj) {
    console.log(`🍍 [Add] (${uploadObj.id}) ${uploadObj.originalFilename}`)
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
      const thumbnailBlob = await generateThumbnail(uploadObj.file)
      const thumbnailFilename = createThumbnailFilename(uploadObj.azureFilename)
      const thumbnailBlobPath = `${uploadObj.userId}/${thumbnailFilename}`
      await uploadThumbnailToAzure(thumbnailBlob, thumbnailBlobPath)
    }
    catch (error) {
      console.error(`❌ Thumbnail generation/upload failed:`, error)
      throw error
    }
  }

  /**
   * Remove an upload from the queue by its hash ID
   *
   * @param {string} id - The unique hash identifier for the upload to remove
   */
  function remove (id) {
    console.log(`🍍 [Remove] (${id})`)
    const index = uploads.value.findIndex(u => u.id === id)
    if (index !== -1) {
      uploads.value.splice(index, 1)
    }
    else {
      console.error(`Cannot find ${id}.`)
    }
  }

  /**
   * Return an upload back to the queued status
   *
   * @param {string} id - The unique hash identifier for the upload
   */
  function returnToQueue (id) {
    const index = uploads.value.findIndex(u => u.id === id)
    if (index !== -1) {
      uploads.value[index].status = 'queued'
    }
    else {
      console.error(`Cannot find ${id}.`)
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
   * Remove all completed uploads from the queue
   */
  function clearCompleted () {
    uploads.value = uploads.value.filter(u => u.status !== 'completed')
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

  async function updateUploadRecord (upload) {
    try {
      await $fetch(`/api/uploads/${upload.id}`, {
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
    }
    catch (error) {
      console.error(`❌ Failed to update database for (${upload.id}):`, error)
    }
  }

  /**
   * Fetch a fresh SAS token and upload a file to Azure Blob Storage
   *
   * @param {string} id - The unique hash identifier for the upload
   * @returns {Promise<void>}
   */
  async function uploadToAzure (id) {
    const index = uploads.value.findIndex(u => u.id === id)

    if (index === -1) {
      throw new Error(`Upload ${id} not found`)
    }

    const upload = uploads.value[index]

    // Fetch fresh SAS token just-in-time
    const tokenResponse = await $fetch('/api/tokens/upload', {
      method: 'POST',
      body: {
        action: 'create',
        blobPath: upload.blobPath,
      },
    })

    try {
      await uploadBlobToAzure({
        url: tokenResponse.upload.url,
        file: upload.file,
        tags: upload.azureTags,
        onProgress: (percent) => {
          uploads.value[index].upload.progress = percent
        },
      })

      uploads.value[index].status = 'completed'
      uploads.value[index].upload.progress = 100

      await updateUploadRecord(upload)
      triggerAnalysisWorkflow(id)
    }
    catch (error) {
      uploads.value[index].status = 'failed'
      uploads.value[index].errors.push(error.message)
      throw error
    }
  }

  /**
   * Start uploading a file to Azure (checks concurrency limit, updates status, and uploads)
   *
   * @param {string} id - The unique hash identifier for the upload
   * @returns {Promise<boolean>} True if upload started and succeeded, false if limit reached or failed
   */
  async function startUpload (id) {
    // Check concurrent upload limit
    if (!canStartUpload.value) {
      console.warn(`⚠️ Max concurrent uploads (${uploadMaxConcurrent}) reached`)
      return false
    }

    // Find the upload
    const index = uploads.value.findIndex(u => u.id === id)
    if (index === -1) {
      console.error(`Cannot find ${id}.`)
      return false
    }

    // Mark as in-progress
    uploads.value[index].status = 'in-progress'

    // Generate and upload thumbnail in the background (don't block main upload)
    const uploadObj = uploads.value[index]
    generateAndUploadThumbnail(uploadObj).catch((error) => {
      console.error(`Failed to generate/upload thumbnail for ${id}:`, error)
      // Don't fail the main upload if thumbnail fails
    })

    // Upload to Azure
    try {
      await uploadToAzure(id)
      return true
    }
    catch (error) {
      console.error(`Upload failed for ${id}:`, error)
      return false
    }
  }

  /**
   * Retry a failed upload (increments retry counter and restarts upload)
   *
   * @param {string} id - The unique hash identifier for the upload to retry
   * @returns {Promise<boolean>} True if retry succeeded, false otherwise
   */
  async function retryUpload (id) {
    const index = uploads.value.findIndex(u => u.id === id)

    if (index === -1) {
      console.error(`Cannot find upload ${id}`)
      return false
    }

    // Increment retry counter
    uploads.value[index].upload.retries += 1

    // Reset progress
    uploads.value[index].upload.progress = 0

    console.log(`🔄 Retrying upload (${id}), attempt #${uploads.value[index].upload.retries}`)

    // Start the upload
    return await startUpload(id)
  }

  /**
   * Process the upload queue - starts uploads for queued items if slots are available
   * Called automatically by the timer every 30 seconds
   */
  async function processQueue () {
    // console.log('⏰ [Auto-upload] Checking queue...')

    if (!autoUploadFromQueue.value) {
      console.log('⏰ [Auto-upload] Auto-upload is disabled ℹ️')
      return
    }

    // if (!hasQueued.value) {
    //   console.log('⏰ [Auto-upload] Queue is empty')
    //   return
    // }

    if (!canStartUpload.value) {
      console.log('⏰ [Auto-upload] No available slots')
      return
    }

    // Start uploads for available slots
    const slotsToFill = availableSlots.value
    const itemsToUpload = queued.value.slice(0, slotsToFill)

    // console.log(`⏰ [Auto-upload] Starting ${itemsToUpload.length} upload(s)`)

    for (const upload of itemsToUpload) {
      await startUpload(upload.id)
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
    autoUploadTimer.value = setInterval(processQueue, uploadAutoIntervalMs)
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

  /**
   * Mark in-flight uploads as interrupted (call after page reload)
   */
  function markInterrupted () {
    uploads.value.forEach((upload) => {
      if (upload.status === 'queued' || upload.status === 'in-progress') {
        upload.status = 'interrupted'
      }
    })
  }

  /**
   * Add files to the upload queue. Handles blob registration and upload object creation.
   *
   * @param {File[]} files - Array of File objects from the drop zone
   */
  async function addFiles (files) {
    const userStore = useUserStore()
    const { createUploadObject } = useUploadObject()

    for (const file of files) {
      try {
        const result = await $fetch('/api/blobs/new', {
          method: 'POST',
          body: {
            userId: userStore.userId,
            filename: file.name,
          },
        })

        const uploadObject = await createUploadObject(file, result)
        await add(uploadObject)
      }
      catch (error) {
        console.error(`❗️ Unable to initialize upload for ${file.name}:`, error)
      }
    }
  }

  return {
    addFiles,
    add,
    markInterrupted,
    autoUploadFromQueue,
    availableSlots,
    canStartUpload,
    completed,
    clearCompleted,
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
    uploadMaxConcurrent,
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
