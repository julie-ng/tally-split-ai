<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  id: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <div class="flex items-center justify-between mb-2 ml-4">
    <h1 class="font-bold text-3xl">
      <template v-if="title">
        {{ title }}
      </template>
      <template v-else>
        {{ `Receipt ${id}` }}
      </template>
    </h1>
    <div class="flex items-center gap-2">
      <UButton
        :to="`/receipts/${props.id}/edit`"
        icon="i-lucide-pencil"
        color="secondary"
        variant="solid"
        class="hover:cursor-pointer"
      >
        Edit
      </UButton>
    </div>
  </div>
</template>
