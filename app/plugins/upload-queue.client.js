import { useUploadQueueStore } from '~/stores/upload-queue.store'

export default defineNuxtPlugin(() => {
  const store = useUploadQueueStore()

  // Detect page reload and mark in-flight uploads as interrupted
  if (performance.getEntriesByType('navigation')[0]?.type === 'reload') {
    store.markInterrupted()
  }

  // Start the auto-upload timer (survives navigation)
  store.startAutoUpload()
})
