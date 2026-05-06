<script setup>
import { useUploadsStore } from '~/stores/uploads.store'

const props = defineProps({
  uploadId: {
    type: String,
    required: true,
  },
})

const uploadsStore = useUploadsStore()
const links = computed(() => uploadsStore.getJsonLinksById(props.uploadId))
</script>

<template>
  <ui-label-content label="Raw Data (JSON)">
    <ul class="pl-3.5 mt-1" style="list-style-type: circle">
      <li
        v-for="link in links"
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
</template>
