import { defineStore } from 'pinia'
import { useUploadQueueStore } from '~/stores/upload-queue.store'

export const useRealtimeStore = defineStore('realtime', () => {
  const eventSource = ref(null)
  const isConnected = ref(false)

  function connect () {
    if (eventSource.value) return

    const sse = new EventSource('/api/realtime/stream')

    sse.addEventListener('workflow-update', (event) => {
      const data = JSON.parse(event.data)
      handleWorkflowUpdate(data)
    })

    sse.addEventListener('open', () => {
      isConnected.value = true
    })

    sse.addEventListener('error', () => {
      isConnected.value = false
    })

    eventSource.value = sse
  }

  function disconnect () {
    if (eventSource.value) {
      eventSource.value.close()
      eventSource.value = null
      isConnected.value = false
    }
  }

  function handleWorkflowUpdate (data) {
    const uploadsStore = useUploadQueueStore()
    const { uploadHashId, step, status } = data

    const upload = uploadsStore.uploads.find(u => u.hashId === uploadHashId)
    if (!upload) return

    if (!upload.workflowStatus) {
      upload.workflowStatus = {}
    }

    upload.workflowStatus[step] = status
  }

  return {
    isConnected,
    connect,
    disconnect,
  }
})
