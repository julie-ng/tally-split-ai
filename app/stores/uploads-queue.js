import { defineStore } from 'pinia'

export const useUploadQueueStore = defineStore('uploadQueue', () => {
  const uploads = ref([])
  const total = computed(() => uploads.value.length)
  const hasItems = computed(() => uploads.value.length > 0)

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
    remove,
    removeAll,
    total,
    uploads
  }
})
