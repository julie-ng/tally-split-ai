<script setup>
import { hasKeys } from '#shared/utils/object.utils.js'
import { useUploadsStore } from '~/stores/uploads.store'

const props = defineProps({
  hashId: { type: String, required: true },
})

const uploadsStore = useUploadsStore()

// Ensure full upload record is loaded (cache-aware).
await uploadsStore.fetchUploadByHashId(props.hashId)

const upload = computed(() => uploadsStore.getUploadByHashId(props.hashId))

// Lazy-load analysis summary (only when upload has been analyzed).
const analysisData = ref(null)
watchEffect(async () => {
  if (!upload.value?.analyzedAt) {
    analysisData.value = null
    return
  }
  analysisData.value = await uploadsStore.fetchAnalysisByHashId(props.hashId)
})

const validatedItems = computed(() => {
  const result = zodSchemas.analysisSummarySchema.safeParse(analysisData.value?.azureAIDocIntel?.results)
  return result.success ? result.data.items : null
})

const hasItems = computed(() => (validatedItems.value?.items?.length ?? 0) > 0)

// Lazy-load annotations notes (annotationsJson is slimmed out of the main
// upload payload by default; fetched via dedicated endpoint).
const annotationsNotes = ref(null)
watchEffect(async () => {
  if (!upload.value?.analyzedAt) {
    annotationsNotes.value = null
    return
  }
  const data = await uploadsStore.fetchAnnotationsByHashId(props.hashId)
  annotationsNotes.value = data?.notes ?? null
})

const jsonLinks = computed(() => [
  { label: 'Summary', href: `/api/analysis/summary/${props.hashId}` },
  { label: 'Annotations', href: `/api/uploads/${props.hashId}/annotations` },
  { label: 'OCR', href: `/api/uploads/${props.hashId}/ocr` },
  { label: 'Polygons', href: `/api/uploads/${props.hashId}/polygons` },
])
</script>

<template>
  <div v-if="!upload" class="pt-6 px-4 text-muted">
    Upload not found.
  </div>
  <div v-else class="pt-6 px-4 grid grid-cols-5 gap-6">
    <div class="col-span-3">
      <UCard>
        <ui-collapsible-property-group title="Overview">
          <ui-file-property label="Hash ID" :text="upload.hashId" />
          <ui-file-property label="Original Filename" :text="upload.originalFilename" />
          <UButton
            v-if="upload.receiptId"
            :to="`/receipts/${upload.receiptId}`"
            color="primary"
            size="sm"
            icon="i-lucide-receipt-euro"
          >
            View Receipt
          </UButton>
        </ui-collapsible-property-group>

        <hr class="text-slate-300 my-3">

        <ui-collapsible-property-group title="AI Analysis">
          <ui-file-property label="Status" :text="upload.analysisStatus" />
          <ui-file-property v-if="upload.analyzedAt" label="Analyzed At" :text="timestampUtils.toShortDate(upload.analyzedAt)" />

          <ui-file-property v-if="hasItems" label="Receipt Line Items">
            <div class="-mt-3">
              <receipt-items-table
                :items="validatedItems.items"
                :has-quantity="validatedItems.hasQuantity"
                :subtotal="validatedItems.subtotal"
                table-class="mt-2 mb-3 text-xs w-full"
              />
            </div>
          </ui-file-property>

          <ui-file-property v-if="annotationsNotes" label="Annotations (gpt-4o)">
            <div class="text-xs mt-1 mb-4 p-2 bg-elevated">
              {{ annotationsNotes }}
            </div>
          </ui-file-property>

          <ui-file-property label="Raw Data (JSON)">
            <ul class="pl-3.5 mt-1" style="list-style-type: circle">
              <li
                v-for="link in jsonLinks"
                :key="link.href"
              >
                <a
                  :href="link.href"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex items-center gap-1 text-xs hover:underline"
                >
                  {{ link.label }}
                  <UIcon name="i-lucide-external-link" class="size-3.5" />
                </a>
              </li>
            </ul>
          </ui-file-property>
        </ui-collapsible-property-group>

        <hr class="text-slate-300 my-3">

        <ui-collapsible-property-group title="Azure Info">
          <ui-file-property label="Blob Size">
            <div class="text-xs mt-1">
              {{ formatBytes(upload.size) }}
            </div>
          </ui-file-property>
          <ui-file-property label="Blob Name">
            <div class="text-xs mt-1">
              {{ upload.blobName }}
            </div>
          </ui-file-property>
          <ui-file-property label="Blob Url">
            <div class="text-xs mt-1">
              {{ upload.blobUrl }}
            </div>
          </ui-file-property>
          <ClientOnly>
            <ui-file-property label="Azure Blob Index Tags">
              <div class="flex flex-wrap gap-2 pt-2">
                <UBadge
                  v-for="tag in azureUtils.blobTagsJsonToObject(upload.azureTags)"
                  :key="tag.key"
                  class="text-slate-500"
                  color="neutral"
                  variant="soft"
                >
                  {{ tag.key }}: {{ tag.value }}
                </UBadge>
                <span v-if="!hasKeys(upload.azureTags, { silent: true })" class="-mt-1">
                  -
                </span>
              </div>
            </ui-file-property>
          </ClientOnly>
        </ui-collapsible-property-group>
      </UCard>
    </div>
    <div class="col-span-2">
      <blob-image
        :blob-name="upload.blobName"
        :alt="upload.blobName"
      />
    </div>
  </div>
</template>
