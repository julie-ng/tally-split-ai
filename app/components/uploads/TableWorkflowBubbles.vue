<script setup>
import { WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-step-status.js'
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
    label: 'Create Expense',
    status: stepStatuses.value.createExpenseStatus,
    errorKey: WORKFLOW_STEP.EXPENSE,
  },
  {
    label: 'Adjust Expense',
    status: stepStatuses.value.adjustExpenseStatus,
    errorKey: WORKFLOW_STEP.ADJUST_EXPENSE,
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
