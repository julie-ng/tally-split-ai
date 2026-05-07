<script setup>
import { UPLOAD_STATUS } from '#shared/enums/upload-status.js'
import { WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-status.js'
import { WORKFLOW_STEP } from '#shared/enums/workflow-step.js'
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
const latestRun = computed(() => workflowStore.latestRunById(props.id))

// `errorKey` is null for the Upload step (errors live on the queue, not
// the workflow run); other rows match WORKFLOW_STEP enum values used as
// keys in workflow_runs.errors.
const steps = computed(() => [
  {
    label: 'Upload',
    status: uploadStepStatus(props.uploadStatus),
    errorKey: null,
  },
  {
    label: 'OCR',
    status: stepStatuses.value.ocrStatus,
    errorKey: WORKFLOW_STEP.OCR,
  },
  {
    label: 'Annotations',
    status: stepStatuses.value.annotationsStatus,
    errorKey: WORKFLOW_STEP.ANNOTATIONS,
  },
  {
    label: 'Normalize',
    status: stepStatuses.value.normalizeStatus,
    errorKey: WORKFLOW_STEP.NORMALIZE,
  },
  {
    label: 'Create Split',
    status: stepStatuses.value.createSplitStatus,
    errorKey: WORKFLOW_STEP.SPLIT,
  },
  {
    label: 'Adjust Split',
    status: stepStatuses.value.adjustSplitStatus,
    errorKey: WORKFLOW_STEP.ADJUST_SPLIT,
  },
])

function tooltipText (step) {
  const base = `${step.label}: ${step.status}`
  if (step.status !== WORKFLOW_STEP_STATUS.FAILED || !step.errorKey) {
    return base
  }
  const message = latestRun.value?.errors?.[step.errorKey]
  if (message) {
    return `${base} — ${message}`
  }
  return base
}

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
      :text="tooltipText(step)"
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
