<script setup>
const props = defineProps({
  subtitle: {
    type: String,
    required: true,
  },
  title: {
    type: [String, Number],
    required: true,
  },
  note: {
    type: String,
    required: false,
    default: '',
  },
})

const hasNote = computed(() => props.note !== '')
</script>

<template>
  <div>
    <UCard class="shadow-md/5">
      <div class="text-sm text-slate-500">
        {{ props.subtitle }}
      </div>
      <div class="text-2xl font-medium text-slate-600">
        {{ props.title }}
        <span v-if="hasNote" class="text-sm font-normal text-slate-500">
          ({{ props.note }})
        </span>
      </div>
    </UCard>
  </div>
</template>
