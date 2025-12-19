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
    default: 'Untitled'
  },
  date: {
    type: String,
    default: ''
  },
  total: {
    type: String,
    default: ''
  },
  tags: {
    type: Array,
    default: []
  },
  imageUrl: {
    type: String,
    default: ''
  }
})

const formattedDate = computed(() => {
  if (!props.date) return ''

  const date = new Date(props.date)
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date)
})

const backgroundUrl = `background-image:url('${props.imageUrl}')`
</script>

<template>
<div class="card is-size-6">
  <div class="p-5">
    <h1 class="is-size-4 has-text-primary has-text-weight-bold">{{ props.title }}</h1>

    <div v-if="props.imageUrl" class="my-4 receipt-preview" :style="backgroundUrl">
    </div>

    <table>
      <tbody>
        <tr>
          <td class="pl-0 has-text-weight-semibold">Date</td>
          <td class="pr-0">{{ formattedDate }}</td>
        </tr>
        <tr>
          <td class="pl-0 has-text-weight-semibold">Total</td>
          <td class="pr-0">{{ props.total }}</td>
        </tr>
        <tr>
          <td class="pl-0 has-text-weight-semibold">Tags</td>
          <td class="pr-0">
            <template v-for="tag, i in props.tags" :id="i">
              {{ tag }}<template v-if="i < props.tags.length - 1">, </template>
            </template>
          </td>
        </tr>
        <tr>
          <td class="pl-0 has-text-weight-semibold">Filename</td>
          <td class="pr-0"><code>{{ props.filename }}</code></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
</template>

<style scoped>
.receipt-preview {
  width: 100%;
  height: 200px;
  background: #ccc;
  background-size: 100% auto;
  border: 1px solid #eee;
  border-radius: 0.35rem;
}
</style>
