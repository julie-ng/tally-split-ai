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
</script>

<template>
<div class="card is-size-6">
  <div class="p-5">
    <h1 class="is-size-4 has-text-weight-bold">{{ props.title }}</h1>
    <table>
      <tbody>
        <tr>
          <td class="pl-0">Date</td>
          <td class="pr-0">{{ formattedDate }}</td>
        </tr>
        <tr>
          <td class="pl-0">Total</td>
          <td class="pr-0">{{ props.total }}</td>
        </tr>
        <tr>
          <td class="pl-0">Tags</td>
          <td class="pr-0">{{ props.tags }}</td>
        </tr>
        <tr>
          <td class="pl-0">Filename</td>
          <td class="pr-0"><code>{{ props.filename }}</code></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
</template>
