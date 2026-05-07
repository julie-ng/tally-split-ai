<script setup>
import { UPLOAD_STATUS } from '#shared/enums/upload-status.js'
import { WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-status.js'
import { useWorkflowStore } from '~/stores/workflow.store'

const props = defineProps({
  uploadStatus: {
    type: String,
    required: true,
  },
  id: {
    type: String,
    required: true,
  },
})

const workflowStore = useWorkflowStore()

/**
 * Map upload status to a step-like status for the first circle.
 * Accepts both DB-side UPLOAD_STATUS values and queue-side strings
 * ('queued' / 'in-progress' / 'failed' / 'interrupted') since
 * uploads/index.vue merges queue rows with DB rows.
 */
function uploadStepStatus (status) {
  switch (status) {
    case UPLOAD_STATUS.UPLOADED: return WORKFLOW_STEP_STATUS.COMPLETED
    case 'in-progress': return WORKFLOW_STEP_STATUS.PROCESSING
    case UPLOAD_STATUS.FAILED:
    case 'interrupted': return WORKFLOW_STEP_STATUS.FAILED
    default: return WORKFLOW_STEP_STATUS.PENDING
  }
}

const stepStatuses = computed(() => workflowStore.stepStatusesById(props.id))

const steps = computed(() => [
  { label: 'Upload', status: uploadStepStatus(props.uploadStatus) },
  { label: 'OCR', status: stepStatuses.value.ocrStatus },
  { label: 'Annotations', status: stepStatuses.value.annotationsStatus },
  { label: 'Normalize', status: stepStatuses.value.normalizeStatus },
  { label: 'Create Split', status: stepStatuses.value.createSplitStatus },
  { label: 'Adjust Split', status: stepStatuses.value.adjustSplitStatus },
])

function stepIcon (status) {
  switch (status) {
    case WORKFLOW_STEP_STATUS.COMPLETED: return 'i-lucide-circle-check'
    case WORKFLOW_STEP_STATUS.FAILED: return 'i-lucide-circle-alert'
    case WORKFLOW_STEP_STATUS.PROCESSING: return 'i-lucide-loader-circle'
    default: return 'i-lucide-circle'
  }
}

function stepColor (status) {
  switch (status) {
    case WORKFLOW_STEP_STATUS.COMPLETED: return 'text-green-500'
    case WORKFLOW_STEP_STATUS.FAILED: return 'text-amber-500'
    case WORKFLOW_STEP_STATUS.PROCESSING: return 'text-blue-500'
    default: return 'text-neutral-300'
  }
}
</script>

<template>
  <div class="flex items-center gap-1">
    <UTooltip
      v-for="step in steps"
      :key="step.label"
      :text="`${step.label}: ${step.status}`"
      arrow
    >
      <span
        class="size-5 text-center rounded-full"
        :class="stepColor(step.status)"
      >
        <UIcon
          :name="stepIcon(step.status)"
          class="size-4 align-middle"
          :class="[
            step.status === WORKFLOW_STEP_STATUS.PROCESSING && 'animate-spin',
          ]"
        />
      </span>
    </UTooltip>
  </div>
</template>
