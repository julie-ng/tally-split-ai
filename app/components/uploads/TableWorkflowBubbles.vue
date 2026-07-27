<script setup>
import { WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-step-status.js'
import { WORKFLOW_STEP_REGISTRY } from '#shared/enums/workflow-step.js'
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

const stepStatuses = computed(() => workflowStore.stepStatusesById(props.id))
const latestRun = computed(() => workflowStore.latestRunById(props.id))

// Upload first (a pseudo-step — status comes from the upload row, and errors
// live on the queue, so errorKey is null), then the real pipeline steps from the
// registry. A step's registry key IS its key in workflow_runs.errors.
const steps = computed(() => [
  {
    label: 'Upload',
    status: uploadStepStatus(props.uploadStatus),
    errorKey: null,
  },
  ...WORKFLOW_STEP_REGISTRY.map(step => ({
    label: step.label,
    status: stepStatuses.value[`${step.key}Status`],
    errorKey: step.key,
  })),
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

// Retry lives in the preview panel's timeline (useUploadPreview → WorkflowTimeline),
// not here — this cell is just the row-level workflow bubbles (one per step).
</script>

<template>
  <div class="flex items-center gap-2">
    <div class="flex items-center gap-1">
      <UTooltip
        v-for="step in steps"
        :key="step.label"
        :text="tooltipText(step)"
        arrow
      >
        <UiStatusLabel type="bubble" :status="step.status" />
      </UTooltip>
    </div>
  </div>
</template>
