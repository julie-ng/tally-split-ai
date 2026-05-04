<script setup>
import { useUploadsStore } from '~/stores/uploads.store'

const props = defineProps({
  hashId: {
    type: String,
    required: true,
  },
})

const uploadsStore = useUploadsStore()
const upload = computed(() => uploadsStore.getUploadByHashId(props.hashId))

const analysisData = ref(null)
const annotationsNotes = ref(null)

async function lazyLoadAnalysis () {
  if (!upload.value?.analyzedAt) {
    analysisData.value = null
    return
  }
  analysisData.value = await uploadsStore.fetchAnalysisByHashId(props.hashId)
}

async function lazyLoadAnnotations () {
  if (!upload.value?.analyzedAt) {
    annotationsNotes.value = null
    return
  }
  const data = await uploadsStore.fetchAnnotationsByHashId(props.hashId)
  annotationsNotes.value = data?.notes ?? null
}

watchEffect(lazyLoadAnalysis)
watchEffect(lazyLoadAnnotations)

const validatedItems = computed(() => {
  const result = zodSchemas.analysisSummarySchema.safeParse(analysisData.value?.azureAIDocIntel?.results)
  return result.success ? result.data.items : null
})

const hasItems = computed(() => (validatedItems.value?.items?.length ?? 0) > 0)

const jsonLinks = computed(() => [
  { label: 'Summary', href: `/api/analysis/summary/${props.hashId}` },
  { label: 'Annotations', href: `/api/uploads/${props.hashId}/annotations` },
  { label: 'OCR', href: `/api/uploads/${props.hashId}/ocr` },
  { label: 'Polygons', href: `/api/uploads/${props.hashId}/polygons` },
])
</script>

<template>
  <div v-if="upload">
    <ui-label-content label="Status" :content="upload.analysisStatus" />
    <ui-label-content v-if="upload.analyzedAt" label="Analyzed At" :content="timestampUtils.toShortDate(upload.analyzedAt)" />

    <ui-label-content v-if="hasItems" label="Receipt Line Items">
      <div class="-mt-3">
        <receipt-items-table
          :items="validatedItems.items"
          :has-quantity="validatedItems.hasQuantity"
          :subtotal="validatedItems.subtotal"
          table-class="mt-2 mb-3 text-xs w-full"
        />
      </div>
    </ui-label-content>

    <ui-label-content v-if="annotationsNotes" label="Annotations (gpt-4o)">
      <div class="text-xs mt-1 mb-4 p-2 bg-elevated">
        {{ annotationsNotes }}
      </div>
    </ui-label-content>

    <ui-label-content label="Raw Data (JSON)">
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
    </ui-label-content>
  </div>
</template>
