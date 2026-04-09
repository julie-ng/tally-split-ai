import { defineStore } from 'pinia'
import { useUploadQueueStore } from '~/stores/upload-queue.store'
import { useUploadsStore } from '~/stores/uploads.store'
import { useWorkflowStore } from '~/stores/workflow.store'

export const useRealtimeStore = defineStore('realtime', () => {
  const eventSource = ref(null)
  const isConnected = ref(false)

  function connect () {
    if (eventSource.value) return

    const sse = new EventSource('/api/realtime/stream')

    sse.addEventListener('workflow-update', (event) => {
      const data = JSON.parse(event.data)
      console.log('[RealtimeStore] SSE event received:', data)
      handleWorkflowUpdate(data)
    })

    sse.addEventListener('open', () => {
      console.log('[RealtimeStore] SSE connected')
      isConnected.value = true
    })

    sse.addEventListener('error', (err) => {
      console.warn('[RealtimeStore] SSE error:', err)
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
    const { uploadHashId, step, status } = data

    // Update upload queue (client-side upload progress)
    const uploadQueueStore = useUploadQueueStore()
    const queueItem = uploadQueueStore.uploads.find(u => u.hashId === uploadHashId)
    if (queueItem) {
      if (!queueItem.workflowStatus) {
        queueItem.workflowStatus = {}
      }
      queueItem.workflowStatus[step] = status
    }

    // Update workflow store (DB-backed workflow data)
    const workflowStore = useWorkflowStore()
    workflowStore.updateStepStatus(uploadHashId, step, status)

    // Refresh upload record (pulls new rows into table if they don't exist yet)
    const uploadsStore = useUploadsStore()
    uploadsStore.refreshUploadByHashId(uploadHashId)
  }

  return {
    isConnected,
    connect,
    disconnect,
  }
})
