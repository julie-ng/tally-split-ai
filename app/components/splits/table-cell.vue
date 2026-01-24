<script setup>
import { useDebounceFn } from '@vueuse/core'
import { useSplitsStore } from '~/stores/splits.store'

/**
 * Splits Table Cell - Editable cell component for splits table
 * Renders a specific field with debounced updates
 */
const props = defineProps({
  splitId: {
    type: Number,
    required: true,
  },
  field: {
    type: String,
    required: true,
    validator: (value) => ['splitAmount', 'userAShare', 'userBShare', 'paidBy', 'isSettled', 'actions'].includes(value),
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
</script>

<template>
  <!-- Split Amount Input -->
  <UInput
    v-if="field === 'splitAmount'"
    v-model="splitAmount"
    :name="`splitAmount-${splitId}`"
    class="w-24"
    variant="subtle"
    trailing-icon="i-lucide-euro"
    :ui="{ base: inputClass, trailingIcon: 'size-4 text-slate-400' }"
  />

  <!-- User A Share Input -->
  <UInput
    v-else-if="field === 'userAShare'"
    v-model="userAShare"
    :name="`userAShare-${splitId}`"
    class="w-24"
    variant="subtle"
    trailing-icon="i-lucide-euro"
    :ui="{ base: inputClass, trailingIcon: 'size-4 text-slate-400' }"
  />

  <!-- User B Share Input -->
  <UInput
    v-else-if="field === 'userBShare'"
    v-model="userBShare"
    :name="`userBShare-${splitId}`"
    class="w-24"
    variant="subtle"
    trailing-icon="i-lucide-euro"
    :ui="{ base: inputClass, trailingIcon: 'size-4 text-slate-400' }"
  />

  <!-- Paid By Radio Buttons -->
  <receipt-split-paid-by
    v-else-if="field === 'paidBy'"
    v-model="paidBy"
    :users="users"
  />

  <!-- Is Settled Checkbox -->
  <UCheckbox
    v-else-if="field === 'isSettled'"
    v-model="isSettled"
    class="cursor-pointer"
  />

  <!-- Action Buttons -->
  <div v-else-if="field === 'actions'" class="flex gap-1">
    <UButton
      variant="soft"
      color="neutral"
      size="xs"
      class="cursor-pointer"
      icon="i-lucide-zap"
      @click="splitHalf"
    >
      50/50
    </UButton>
    <UButton
      variant="soft"
      color="neutral"
      size="xs"
      class="cursor-pointer"
      icon="i-lucide-eraser"
      @click="zeroOut"
    >
      Zero
    </UButton>
  </div>
</template>
