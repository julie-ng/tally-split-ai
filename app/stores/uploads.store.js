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
   * Mark an upload as in-progress (respects max concurrent limit)
   *
   * @param {string} hashId - The unique hash identifier for the upload
   * @returns {boolean} True if upload was started, false if limit reached
   */
  function nextUpload(hashId) {
    if (!canStartUpload.value) {
      console.warn(`⚠️ Max concurrent uploads (${MAX_CONCURRENT_UPLOADS}) reached`)
      return false
    }

    const index = uploads.value.findIndex((u) => u.hashId === hashId)
    if (index !== -1) {
      uploads.value[index].status = 'in-progress'
      return true
    } else {
      console.error(`Cannot find ${hashId}.`)
      return false
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
    nextUpload,
    queued,
    remove,
    removeAll,
    returnToQueue,
    totalCompleted,
    totalFailed,
    totalInProgress,
    totalItems,
    totalQueued,
    uploads
  }
})
