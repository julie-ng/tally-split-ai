import { defineStore } from 'pinia'

export const useUploadQueueStore = defineStore('uploadQueue', () => {
  const uploads = ref([])
  const totalItems = computed(() => uploads.value.length)
  const hasItems = computed(() => uploads.value.length > 0)

  const queued = computed(() => uploads.value.filter((u) => u.status === 'queued'))
  const hasQueued = computed(() => uploads.value.filter((u) => u.status === 'queued').length > 0)
  const totalQueued = computed(() => uploads.value.filter((u) => u.status=== 'queued').length)

  const hasInProgress = computed(() => uploads.value.filter((u) => u.status === 'in-progress').length > 0)
  const inProgress = computed(() => uploads.value.filter((u) => u.status === 'in-progress'))
  const totalInProgress = computed(() => uploads.value.filter((u) => u.status === 'in-progress').length)

  function getName(hashId) {
    console.log(`🍍 getName(${hashId})`)
    const upload = uploads.value.find((u) => u.hashId === hashId)
    return upload.name
  }

  function add(uploadObj) {
    console.log(`🍍 [Add] (${uploadObj.hashId}) ${uploadObj.originalFilename}`)
    if (!(uploadObj.file instanceof File)) {
      throw new Error('Upload must have `file` attribute of type `File`')
    }
    uploads.value.push(uploadObj)
  }

  function remove(hashId) {
    console.log(`🍍 [Remove] (${hashId})`)
    const index = uploads.value.findIndex((u) => u.hashId === hashId)
    if (index !== -1) {
      uploads.value.splice(index, 1)
    } else {
      console.error(`Cannot find ${hashId}.`)
    }
  }

  function nextUpload(hashId) {
    const index = uploads.value.findIndex((u) => u.hashId === hashId)
    if (index !== -1) {
      uploads.value[index].status = 'in-progress'
    } else {
      console.error(`Cannot find ${hashId}.`)
    }
  }

  function returnToQueue(hashId) {
    const index = uploads.value.findIndex((u) => u.hashId === hashId)
    if (index !== -1) {
      uploads.value[index].status = 'queued'
    } else {
      console.error(`Cannot find ${hashId}.`)
    }
  }

  async function removeAll() {
    console.log('🍍‼️ [Remove All]')
    // uploads.value = [] // breaks reactivity
    const total = uploads.value.length
    uploads.value.splice(0, total)
  }

  return {
    add,
    getName,
    hasItems,
    hasInProgress,
    hasQueued,
    inProgress,
    nextUpload,
    queued,
    remove,
    removeAll,
    returnToQueue,
    totalItems,
    totalInProgress,
    totalQueued,
    uploads
  }
})
