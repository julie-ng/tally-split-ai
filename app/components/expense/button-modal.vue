<script setup>
defineProps({
  label: {
    type: String,
    default: 'New expense',
  },
  variant: {
    type: String,
    default: 'solid',
  },
  color: {
    type: String,
    default: 'primary',
  },
})

const emit = defineEmits(['created'])

const showModal = ref(false)

function onCreated (expense) {
  showModal.value = false
  emit('created', expense)
}
</script>

<template>
  <div>
    <UButton
      icon="i-lucide-plus"
      class="cursor-pointer"
      :variant="variant"
      :color="color"
      size="md"
      @click="showModal = true"
    >
      {{ label }}
    </UButton>

    <UModal v-model:open="showModal" title="New expense">
      <template #body>
        <expense-create-form
          @created="onCreated"
          @cancel="showModal = false"
        />
      </template>
    </UModal>
  </div>
</template>
