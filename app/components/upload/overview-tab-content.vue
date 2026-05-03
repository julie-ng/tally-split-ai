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
</script>

<template>
  <div v-if="!upload" class="pt-6 px-4 text-muted">
    Upload not found.
  </div>
  <div v-else class="pt-6 px-4 grid grid-cols-5 gap-6">
    <div class="col-span-3">
      <UCard>
        <ui-collapsible-property-group title="File Info">
          <ui-file-property label="Original Filename" :text="upload.originalFilename" />
          <ui-file-property label="Blob Size" :text="formatBytes(upload.size)" />
        </ui-collapsible-property-group>

        <hr class="text-slate-300 my-3">

        <ui-collapsible-property-group title="Azure Info">
          <ui-file-property label="Blob Name" :text="upload.blobName" />
          <ui-file-property label="Blob Url" :text="upload.blobUrl" />
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

        <hr class="text-slate-300 my-3">

        <ui-collapsible-property-group title="OCR Analysis">
          <ui-file-property label="Status" :text="upload.analysisStatus" />
          <ui-file-property v-if="upload.analyzedAt" label="Analyzed At" :text="timestampUtils.toShortDate(upload.analyzedAt)" />
          <ui-file-property v-if="upload.analyzedAt" label="OCR Result">
            <ClientOnly>
              <pre class="w-fit mt-1 p-5 bg-slate-100 rounded-lg font-mono text-xs">
            {{ upload.ocrText }}
          </pre>
            </ClientOnly>
          </ui-file-property>
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
