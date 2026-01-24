<script setup>
import { useDebounceFn } from '@vueuse/core'
import { useSplitsStore } from '~/stores/splits.store'

/**
 * Splits Table Row - Editable row component for splits table
 *
 * This component renders a single table row with editable split fields.
 * Each row has its own debounced update logic to batch changes.
 * It does NOT render <tr> - parent table handles that via UTable.
 *
 * Used in cell templates like: <template #splitAmount-cell="{ row }">
 */
const props = defineProps({
  splitId: {
    type: Number,
    required: true,
  },
})

const toast = useToast()
const splitsStore = useSplitsStore()

// User config for paidBy options
const config = useRuntimeConfig()
const user1Name = config.public.splitUserOneName
const user2Name = config.public.splitUserTwoName
const user1Id = config.public.splitUserOneId
const user2Id = config.public.splitUserTwoId
const users = [
  { id: user1Id, name: user1Name },
  { id: user2Id, name: user2Name },
]

/**
 * Split Refs
 */
const split = computed(() => splitsStore.getSplitById(props.splitId))
const sumsUp = computed(() => splitsStore.doesSplitAddUp(props.splitId))

/**
 * Writable computed refs - all accumulate into pendingUpdates
 */
const splitAmount = computed({
  get: () => split.value?.splitAmount,
  set: (value) => {
    if (value !== '') {
      pendingUpdates.value.splitAmount = parseFloat(value)
      debouncedUpdate()
    }
  },
})

const paidBy = computed({
  get: () => split.value?.paidBy,
  set: (value) => {
    pendingUpdates.value.paidBy = value
    debouncedUpdate()
  },
})

const userAShare = computed({
  get: () => split.value?.userAShare,
  set: (value) => {
    if (value !== '') {
      pendingUpdates.value.userAShare = parseFloat(value)
      debouncedUpdate()
    }
  },
})

const userBShare = computed({
  get: () => split.value?.userBShare,
  set: (value) => {
    if (value !== '') {
      pendingUpdates.value.userBShare = parseFloat(value)
      debouncedUpdate()
    }
  },
})

const isSettled = computed({
  get: () => split.value?.isSettled,
  set: (value) => {
    pendingUpdates.value.isSettled = value
    debouncedUpdate()
  },
})

/**
 * UI Actions
 */
const zeroOut = () => {
  pendingUpdates.value.splitAmount = 0
  pendingUpdates.value.userAShare = 0
  pendingUpdates.value.userBShare = 0
  pendingUpdates.value.paidBy = null
  pendingUpdates.value.isSettled = false
  debouncedUpdate()
}

const splitHalf = () => {
  pendingUpdates.value.userAShare = split.value?.splitAmount / 2
  pendingUpdates.value.userBShare = split.value?.splitAmount / 2
  debouncedUpdate()
}

/**
 * Debounced Update Logic
 */
const pendingUpdates = ref({})

const debouncedUpdate = useDebounceFn(async () => {
  const updates = { ...pendingUpdates.value }
  pendingUpdates.value = {}

  try {
    await splitsStore.updateSplit(props.splitId, updates)
  }
  catch (err) {
    showToast(err)
  }
}, 500)

/**
 * Styles
 */
const inputClass = computed(() => {
  if (!sumsUp.value) {
    return 'text-right border border-orange-500 rounded-md'
  }
  return 'text-right'
})

/**
 * Helpers
 */
function showToast (err) {
  console.error('Auto-save failed:', err)
  toast.add({
    title: 'Error saving split',
    description: err.message || 'Failed to save changes',
    color: 'error',
    icon: 'i-lucide-triangle-alert',
    timeout: 5000,
    ui: { root: 'bg-slate-100' },
  })
}

// Expose for parent template access
defineExpose({
  splitAmount,
  userAShare,
  userBShare,
  paidBy,
  isSettled,
  sumsUp,
  inputClass,
  users,
  splitHalf,
  zeroOut,
})
</script>

<template>
  <!-- This component uses defineExpose for parent to access reactive data -->
  <!-- Actual rendering is done by parent table via cell templates -->
  <slot
    :split-amount="splitAmount"
    :user-a-share="userAShare"
    :user-b-share="userBShare"
    :paid-by="paidBy"
    :is-settled="isSettled"
    :sums-up="sumsUp"
    :input-class="inputClass"
    :users="users"
    :split-half="splitHalf"
    :zero-out="zeroOut"
  />
</template>
