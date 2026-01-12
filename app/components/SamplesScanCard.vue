<script setup>
import { computed } from 'vue'

const props = defineProps({
  filename: {
    type: String,
    default: 'filename.jpg',
  },
  path: {
    type: String,
    default: 'foo/bar/filename.jpg',
  },
  title: {
    type: String,
    default: 'Untitled',
  },
  date: {
    type: String,
    default: '',
  },
  total: {
    type: String,
    default: '',
  },
  tags: {
    type: Array,
    default: () => [],
  },
  imageSrc: {
    type: String,
    default: '',
  },
  imageLink: {
    type: String,
    default: '',
  },
})

const formattedDate = computed(() => {
  if (!props.date) return ''

  const date = new Date(props.date)
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
})

const backgroundUrl = `background-image:url('${props.imageSrc}')`
</script>

<template>
  <div>
    <UCard>
      <template #header>
        <h1 class="font-bold text-lg text-blue-700">
          {{ props.title }}
        </h1>
      </template>
      <div v-if="props.imageLink && props.imageSrc">
        <a :href="props.imageLink" target="_blank">
          <div v-if="props.imageSrc" class="mb-3 receipt-preview" :style="backgroundUrl" />
        </a>
      </div>
      <div v-else-if="props.imageSrc" class="mb-3 receipt-preview" :style="backgroundUrl" />

      <code class="text-xs text-slate-400 ">
        <a
          v-if="props.imageLink"
          :href="props.imageLink"
          target="_blank"
          class="hover:text-blue-700 hover:underline"
        >
          {{ props.filename }}
        </a>
        <span v-else>
          {{ props.filename }}
        </span>
      </code>

      <table class="mt-4 w-full table-auto">
        <tbody>
          <tr>
            <td class="py-2 pl-0 pr-4 text-sm font-semibold">
              Date
            </td>
            <td class="py-2 pr-0 text-right text-sm">
              {{ formattedDate }}
            </td>
          </tr>
          <tr>
            <td class="py-2 pl-0 pr-4 text-sm font-semibold">
              Total
            </td>
            <td class="py-2 pr-0 text-right text-sm">
              {{ props.total }}
            </td>
          </tr>
          <tr>
            <td class="py-2 pl-0 pr-4 text-sm font-semibold">
              Tags
            </td>
            <td class="py-2 pr-0 text-right text-sm">
              <span v-for="tag, i in props.tags" :key="i" class="px-2 py-1 ml-2 bg-blue-50 text-slate-400 rounded-sm text-xs">{{ tag }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </UCard>
  </div>
</template>

<style scoped>
.receipt-preview {
  width: 100%;
  height: 200px;
  background: #ccc;
  background-size: 100% auto;
}
</style>
