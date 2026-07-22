<script setup>
// MOCK — hardcoded data, not wired to any store yet. For nailing the visual
// of the uploads workflow-progress timeline. Delete the `MOCK_STEPS` const and
// feed real workflow_runs data (status + per-step timestamps) when wiring up.
//
// Statuses use the real WORKFLOW_STEP_STATUS values so every visual state is
// represented here at once: completed / processing / pending / skipped / failed.
//
// `details` = a list of { label, value } rows shown when the step is expanded.
// Only completed steps that produced output have it; pending/skipped don't.

const MOCK_STEPS = [
  {
    key: 'upload',
    label: 'Upload',
    description: 'File received',
    status: 'completed',
    startedAt: '2026-07-22T10:21:00',
    completedAt: '2026-07-22T10:21:03',
    details: [
      { label: 'File', value: 'Scanned_20260629-1611-03.jpg' },
      { label: 'Size', value: '343 KB' },
    ],
  },
  {
    key: 'ocr',
    label: 'OCR Analysis',
    description: 'Text extraction (Azure Document Intelligence)',
    status: 'completed',
    startedAt: '2026-07-22T10:21:04',
    completedAt: '2026-07-22T10:21:10',
    details: [
      { label: 'Merchant', value: 'EDEKA Yilmaz' },
      { label: 'Address', value: 'Lerchenauer Str. 3, 80809 München' },
      { label: 'Line items', value: '14' },
      { label: 'Total', value: '€41.95' },
    ],
  },
  {
    key: 'annotations',
    label: 'Handwritten analysis',
    description: 'Detecting initials, circles, strikethroughs (GPT-4o)',
    status: 'completed',
    startedAt: '2026-07-22T10:21:10',
    completedAt: '2026-07-22T10:21:16',
    summary: 'No handwritten annotations were detected to indicate who paid, and the total remains unchanged. The adjusted total is split evenly between Julie and Matt.',
    details: [
      { label: 'Initials found', value: 'None' },
      { label: 'Strikethroughs', value: '0' },
      { label: 'Confidence', value: '0.92' },
    ],
  },
  {
    key: 'normalize',
    label: 'Normalize',
    description: 'Cleaning date, title, filename',
    status: 'processing',
    startedAt: '2026-07-22T10:21:16',
    completedAt: null,
    details: null,
  },
  {
    key: 'createExpense',
    label: 'Create expense',
    description: 'Expense from receipt total',
    status: 'pending',
    startedAt: null,
    completedAt: null,
    details: null,
  },
  {
    key: 'adjustExpense',
    label: 'Adjust expense',
    description: 'Asymmetric split from annotations',
    status: 'skipped',
    startedAt: null,
    completedAt: null,
    details: null,
  },
]

// Per-status visual config.
const STATUS_CONFIG = {
  completed: {
    icon: 'i-lucide-check',
    dot: 'bg-inverted text-inverted border-inverted',
    label: 'Completed',
    labelClass: 'text-default',
    dotColor: 'bg-success',
  },
  processing: {
    icon: 'i-lucide-loader-circle',
    dot: 'bg-primary/10 text-primary border-primary',
    iconClass: 'animate-spin',
    label: 'Processing',
    labelClass: 'text-primary',
  },
  pending: {
    icon: 'i-lucide-circle',
    dot: 'bg-elevated text-dimmed border-default',
    label: 'Pending',
    labelClass: 'text-dimmed',
    dashed: true,
    dim: true,
  },
  skipped: {
    icon: 'i-lucide-minus',
    dot: 'bg-elevated text-muted border-default',
    label: 'Skipped',
    labelClass: 'text-muted',
    dim: true,
  },
  failed: {
    icon: 'i-lucide-x',
    dot: 'bg-error/10 text-error border-error',
    label: 'Failed',
    labelClass: 'text-error',
  },
}

function cfg (status) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
}

function fmtDuration (startedAt, completedAt) {
  if (!startedAt || !completedAt) {
    return null
  }
  return fmtSeconds(Math.round((new Date(completedAt) - new Date(startedAt)) / 1000))
}

const steps = MOCK_STEPS

// Run start = the pipeline's created_at (shown once at the top). Mock value.
const runStartedAt = '2026-07-22T10:21:00'

// Live "now", ticked every second, so the processing step's elapsed counter
// updates (1s, 2s, 3s…). Only runs while some step is processing.
const now = ref(Date.now())
let ticker = null
const hasProcessing = computed(() => steps.some(s => s.status === 'processing'))

onMounted(() => {
  if (hasProcessing.value) {
    ticker = setInterval(() => {
      now.value = Date.now()
    }, 1000)
  }
})
onBeforeUnmount(() => {
  if (ticker) {
    clearInterval(ticker)
  }
})

// MOCK: pin the processing step's start to ~4s before load so the live counter
// reads a small, sensible number instead of hours. (Real data won't need this.)
const processingStep = steps.find(s => s.status === 'processing')
if (processingStep) {
  processingStep.startedAt = new Date(now.value - 4000).toISOString()
}

// Elapsed seconds for a still-running step, from its start to live `now`.
function elapsed (startedAt) {
  if (!startedAt) {
    return null
  }
  return fmtSeconds(Math.floor((now.value - new Date(startedAt)) / 1000))
}

function fmtSeconds (totalSeconds) {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

function fmtDateTime (iso) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Which step keys are expanded. Start with OCR open so the detail state is
// visible on load. A step is expandable only if it has details.
const expanded = ref(new Set(['ocr', 'annotations']))

function isExpandable (step) {
  return !!step.summary || (Array.isArray(step.details) && step.details.length > 0)
}

function toggle (step) {
  if (!isExpandable(step)) {
    return
  }
  const next = new Set(expanded.value)
  if (next.has(step.key)) {
    next.delete(step.key)
  }
  else {
    next.add(step.key)
  }
  expanded.value = next
}
</script>

<template>
  <div class="p-4">
    <div class="mb-4">
      <p class="text-sm font-semibold text-default">
        Workflow
      </p>
      <p class="text-xs text-dimmed">
        Receipt processing pipeline started {{ fmtDateTime(runStartedAt) }}
      </p>
    </div>

    <ol class="relative">
      <li
        v-for="(step, i) in steps"
        :key="step.key"
        class="relative flex gap-3 pb-6 last:pb-0"
      >
        <!-- Connector line (this dot → next). Hidden on last item. -->
        <span
          v-if="i < steps.length - 1"
          class="absolute left-[9px] top-9 -bottom-0 w-px bg-neutral-300 dark:bg-neutral-600"
          aria-hidden="true"
        />

        <!-- Status dot (mt nudges the check to align with the step label,
             which sits below the box's top padding) -->
        <span
          class="relative z-10 mt-3 flex size-5 shrink-0 items-center justify-center rounded-full border"
          :class="cfg(step.status).dot"
        >
          <UIcon
            :name="cfg(step.status).icon"
            class="size-3"
            :class="cfg(step.status).iconClass"
          />
        </span>

        <!-- Box -->
        <div
          class="flex-1 min-w-0 rounded-lg border border-default bg-default"
          :class="[
            cfg(step.status).dashed ? 'border-dashed' : '',
            cfg(step.status).dim ? 'opacity-60' : '',
          ]"
        >
          <!-- Header (clickable when expandable) -->
          <button
            type="button"
            class="w-full px-3 py-3 text-left"
            :class="isExpandable(step) ? 'cursor-pointer' : 'cursor-default'"
            @click="toggle(step)"
          >
            <div class="flex items-center gap-2 min-w-0">
              <p class="text-sm font-medium text-default max-w-[70%] truncate mb-0.5">
                {{ step.label }}
              </p>
              <span class="ml-auto flex shrink-0 items-center gap-1.5 text-xs">
                <!-- Leading status dot (e.g. green for completed) -->
                <span
                  v-if="cfg(step.status).dotColor"
                  class="size-2 rounded-full"
                  :class="cfg(step.status).dotColor"
                />
                <span
                  class="font-medium"
                  :class="cfg(step.status).labelClass"
                >
                  {{ cfg(step.status).label }}
                </span>
                <!-- Completed → static duration; Processing → live elapsed. -->
                <span
                  v-if="step.status === 'completed' && fmtDuration(step.startedAt, step.completedAt)"
                  class="text-muted tabular-nums"
                >
                  · {{ fmtDuration(step.startedAt, step.completedAt) }}
                </span>
                <span
                  v-else-if="step.status === 'processing' && elapsed(step.startedAt)"
                  class="text-muted tabular-nums"
                >
                  · {{ elapsed(step.startedAt) }}
                </span>
              </span>
              <UIcon
                v-if="isExpandable(step)"
                name="i-lucide-chevron-down"
                class="size-4 shrink-0 text-highlighted transition-transform"
                :class="expanded.has(step.key) ? 'rotate-180' : ''"
              />
            </div>
          </button>

          <!-- Expanded detail -->
          <div
            v-if="isExpandable(step) && expanded.has(step.key)"
            class="border-t border-default px-3 py-3 space-y-2"
          >
            <!-- Step description (moved out of the header to reduce noise) -->
            <p
              v-if="step.description"
              class="text-xs text-muted mb-3"
            >
              {{ step.description }}
            </p>

            <!-- LLM summary — a natural-language paragraph (e.g. the split
                 reasoning), shown above the structured rows in a tinted box. -->
            <p
              v-if="step.summary"
              class="rounded-md bg-muted px-2.5 py-2 text-xs leading-relaxed text-toned"
            >
              {{ step.summary }}
            </p>

            <div
              v-if="step.details?.length"
              class="space-y-1"
            >
              <div
                v-for="d in step.details"
                :key="d.label"
                class="flex items-baseline gap-2 text-xs"
              >
                <span class="w-24 shrink-0 text-muted">{{ d.label }}</span>
                <span class="text-default break-words tabular-nums">{{ d.value }}</span>
              </div>
            </div>
          </div>
        </div>
      </li>
    </ol>
  </div>
</template>
