<script setup>
import { useSplitsStore } from '~/stores/splits.store'

const props = defineProps({
  splitId: {
    type: Number,
    default: null,
  },
})

const emit = defineEmits(['close'])

const splitsStore = useSplitsStore()
const split = computed(() => props.splitId ? splitsStore.getSplitById(props.splitId) : null)

function handleClose () {
  emit('close')
}

function onKeydown (event) {
  if (event.key === 'Escape' && props.splitId) {
    handleClose()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <UDashboardPanel id="split-detail">
    <template #header>
      <UDashboardNavbar
        :title="split?.receipt?.title ?? 'Split'"
        :description="split?.receipt?.merchantName"
      >
        <template #right>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            aria-label="Close"
            @click="handleClose"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="pt-6 px-4">
        <split-overview v-if="splitId" :split-id="splitId" />
      </div>
    </template>
  </UDashboardPanel>
</template>
