<script setup>
import { hasKeys } from '#shared/utils/object.utils.js'
import { useUploadsStore } from '~/stores/uploads.store'

const props = defineProps({
  hashId: { type: String, required: true },
})

const uploadsStore = useUploadsStore()
const upload = computed(() => uploadsStore.getUploadByHashId(props.hashId))
</script>

<template>
  <div v-if="upload">
    <ui-label-content label="Blob Size">
      <div class="text-xs mt-1">
        {{ formatBytes(upload.size) }}
      </div>
    </ui-label-content>
    <ui-label-content label="Blob Name">
      <div class="text-xs mt-1">
        {{ upload.blobName }}
      </div>
    </ui-label-content>
    <ui-label-content label="Blob Url">
      <div class="text-xs mt-1">
        {{ upload.blobUrl }}
      </div>
    </ui-label-content>
    <ClientOnly>
      <ui-label-content label="Azure Blob Index Tags">
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
      </ui-label-content>
    </ClientOnly>
  </div>
</template>
