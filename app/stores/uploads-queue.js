import { defineStore } from 'pinia'

export const useUploadQueueStore = defineStore('uploadQueue', () => {
  const uploads = ref({})
  const total = computed(() => Object.keys(uploads.value).length)
  const hasItems = computed(() => Object.keys(uploads.value).length > 0)

  function getName(id) {
    console.log(`🍍 getName(${id})`)
    return uploads.value[id].name
  }

  function add(key, fileObj) {
    console.log(`🍍 [Add] (${key}) ${fileObj.originalFilename}`)
    if (!(fileObj.file instanceof File)) {
      throw new Error('file attribute must be of type File')
    }
    uploads.value[key] = fileObj
  }

  function remove(key) {
    console.log(`🍍 [Remove] (${key})`)
    if (Object.hasOwn(uploads.value, key)) {
      delete uploads.value[key]
    } else {
      console.error(`Cannot remove item. Key ${key} does not exist.`)
    }
  }

  async function removeAll() {
    console.log('🍍‼️ [Remove All]')
    // Need to individually delete keys to preserve reactivity
    Object.keys(uploads.value).forEach(key => {
      delete uploads.value[key]
    })
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
