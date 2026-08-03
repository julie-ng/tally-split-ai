<script setup>
// Resizable side-panel presentation of the upload preview (Workflow · Image
// tabs), for the uploads list page. Mirrors expenses' PreviewPanel.vue.
//
// It is a RIGHT-side UDashboardSidebar (not a UDashboardPanel) so its resize
// handle sits on its LEFT edge and it holds a remembered width — letting the
// table panel flex to full width when this closes. Own UDashboardGroup for an
// ISOLATED collapse context (two sidebars sharing a group's sidebarCollapsed ref
// clobber each other). unit="rem" matches the app group's resize math.
//
// Behaviour (open-state, ?preview/?tab URL sync, esc, load) lives in
// useUploadPreview(); this owns only layout + tabs. Data (timeline steps, the
// previewed upload, loading flag) arrives as props — no fetching here.
const open = defineModel('open', {
  type: Boolean,
  default: false,
})

const activeTab = defineModel('activeTab', {
  type: String,
  default: 'workflow',
})

defineEmits(['retry'])

const props = defineProps({
  // The previewed upload id (for the Image tab leaf + open guard).
  uploadId: {
    type: [String, null],
    default: null,
  },
  // The previewed upload row (filename, uploadedAt, id) for the header.
  upload: {
    type: Object,
    default: null,
  },
  // Workflow timeline steps (status + timestamps + detail bodies).
  steps: {
    type: Array,
    default: () => [],
  },
  // Run start (workflow_runs.created_at) for the timeline header.
  runStartedAt: {
    type: String,
    default: null,
  },
  // Run finish (workflow_runs.completed_at); null while running.
  runCompletedAt: {
    type: String,
    default: null,
  },
  // The workflow_runs uuid, shown dimmed in the timeline header.
  runUuid: {
    type: [String, null],
    default: null,
  },
  // Run-level status (WORKFLOW_RUN_STATUS), shown as a badge in the timeline header.
  runStatus: {
    type: [String, null],
    default: null,
  },
  // True while the cross-store load is in flight — drives the tab skeletons.
  loading: {
    type: Boolean,
    default: false,
  },
  // Retry affordance for the timeline header — owner-gated + owner-handled.
  canRetry: {
    type: Boolean,
    default: false,
  },
  isRetryExpired: {
    type: Boolean,
    default: false,
  },
  isRetrying: {
    type: Boolean,
    default: false,
  },
  // The created expense id, for the Create Expense footer link (null until loaded).
  expenseId: {
    type: [String, null],
    default: null,
  },
})

const tabs = [
  { label: 'Workflow', value: 'workflow', slot: 'workflow' },
  { label: 'Image', value: 'image', slot: 'image' },
]

const expenseHref = computed(() =>
  props.expenseId ? `/expenses?preview=${props.expenseId}` : undefined,
)
</script>

<template>
  <UDashboardGroup v-if="open" unit="rem" class="contents">
    <UDashboardSidebar
      id="upload-preview"
      side="right"
      resizable
      :default-size="28"
      :min-size="22"
      :max-size="48"
      :ui="{
        root: 'overflow-hidden min-w-0',
        header: 'h-auto py-3 items-start min-w-0',
        body: 'overflow-hidden min-h-0 min-w-0 p-0',
      }"
    >
      <template #header>
        <!-- Title (neutral). Subtitle row: upload id, then a separator + the
             relative upload time (tooltip → full date w/ tz on hover). The
             timestamp sits next to the id, not pushed to the right edge. -->
        <div class="w-full min-w-0 pl-2">
          <div class="flex items-center gap-2 min-w-0">
            <p class="font-bold flex-1 min-w-0 truncate text-default">
              Workflow Preview
            </p>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              aria-label="Close preview"
              class="shrink-0"
              @click="open = false"
            />
          </div>
          <div class="flex items-baseline gap-1.5 min-w-0 text-xs text-dimmed">
            <span class="font-mono truncate">
              Upload ID: {{ upload?.id || 'Upload' }}
            </span>
            <template v-if="upload?.uploadedAt">
              <span class="shrink-0" aria-hidden="true">·</span>
              <UTooltip
                :text="dateUtils.formatDate(new Date(upload.uploadedAt))"
                :delay-duration="0"
              >
                <time
                  :datetime="upload.uploadedAt"
                  class="shrink-0 tabular-nums"
                >
                  {{ timestampUtils.toRelative(upload.uploadedAt) }}
                </time>
              </UTooltip>
            </template>
          </div>
        </div>
      </template>

      <template #default>
        <!-- Two facets of one upload as tabs (activeTab is URL-backed via ?tab=
             — see useUploadPreview). Same :ui as the expenses preview: fixed tab
             list on top, scrolling content below (min-h-0 on the root + content
             is load-bearing). -->
        <UTabs
          v-model="activeTab"
          :items="tabs"
          size="md"
          variant="link"
          color="primary"
          :ui="{
            indicator: 'border-b-3 border-primary',
            trigger: 'cursor-pointer',
            root: 'flex flex-col h-full min-h-0 w-full gap-0',
            list: 'shrink-0 px-4 gap-4',
            content: 'flex-1 overflow-y-auto min-h-0 px-3',
          }"
        >
          <template #workflow>
            <!-- Skeleton while the cross-store load is in flight. -->
            <div v-if="loading" class="p-4 space-y-3">
              <USkeleton v-for="n in 6" :key="n" class="h-12 w-full" />
            </div>
            <UploadWorkflowTimeline
              v-else
              :steps="steps"
              :run-started-at="runStartedAt"
              :run-completed-at="runCompletedAt"
              :run-uuid="runUuid"
              :run-status="runStatus"
              :can-retry="canRetry"
              :is-expired="isRetryExpired"
              :retrying="isRetrying"
              @retry="$emit('retry')"
            >
              <!-- Create Expense step footer: link to the created expense.
                   Enabled once the expense is loaded; disabled while null
                   (standalone/not-yet-created). -->
              <template #footer-createExpense>
                <UButton
                  label="View expense"
                  icon="i-lucide-coins"
                  size="xs"
                  color="neutral"
                  variant="subtle"
                  :to="expenseHref"
                  :disabled="!expenseId"
                />
              </template>

              <!-- OCR step footer: raw JSON links (open externally). The
                   /api/analysis/summary endpoint is intentionally NOT linked
                   here — it backs ReceiptLineItemsCard / BlobLineItemsModal. -->
              <template v-if="uploadId" #footer-ocr>
                <div class="flex flex-wrap gap-2">
                  <UButton
                    label="View OCR (JSON)"
                    icon="i-lucide-file-braces"
                    size="xs"
                    color="neutral"
                    variant="outline"
                    :to="`/api/uploads/${uploadId}/ocr`"
                    target="_blank"
                    external
                  />
                  <UButton
                    label="View Polygons (JSON)"
                    icon="i-lucide-file-braces"
                    size="xs"
                    color="neutral"
                    variant="outline"
                    :to="`/api/uploads/${uploadId}/polygons`"
                    target="_blank"
                    external
                  />
                </div>
              </template>

              <!-- Handwritten step footer: annotations JSON (open externally). -->
              <template v-if="uploadId" #footer-annotations>
                <UButton
                  label="View Annotations (JSON)"
                  icon="i-lucide-file-braces"
                  size="xs"
                  color="neutral"
                  variant="outline"
                  :to="`/api/uploads/${uploadId}/annotations`"
                  target="_blank"
                  external
                />
              </template>
            </UploadWorkflowTimeline>
          </template>

          <template #image>
            <!-- Skeleton while loading; a few bars + an image-shaped block. -->
            <div v-if="loading" class="p-4 space-y-3">
              <USkeleton class="h-5 w-1/2" />
              <USkeleton class="h-4 w-2/3" />
              <USkeleton class="h-4 w-1/3" />
              <USkeleton class="w-full aspect-3/4 rounded-lg" />
            </div>
            <UploadImageTab v-else-if="uploadId" :id="uploadId" />
          </template>
        </UTabs>
      </template>
    </UDashboardSidebar>
  </UDashboardGroup>
</template>
