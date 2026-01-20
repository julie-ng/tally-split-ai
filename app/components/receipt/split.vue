<script setup>
import { useDebounceFn } from '@vueuse/core'
import { useSplitsStore } from '~/stores/splits.store'

const props = defineProps({
  splitId: {
    type: Number,
    required: true,
  },
})

const toast = useToast()
const splitsStore = useSplitsStore()

// Temporary until Auth implemented
const config = useRuntimeConfig()
const user1Name = config.public.splitUserOneName
const user2Name = config.public.splitUserTwoName
const user1Id = config.public.splitUserOneId
const user2Id = config.public.splitUserTwoId
const users = [
  {
    id: user1Id,
    name: user1Name,
  },
  {
    id: user2Id,
    name: user2Name,
  },
]

// ❗️ TODO: just always show errors in UI.
// const splitErrors = computed(() => splitsStore.getSplitError(props.splitId))
// splitsStore.testErrors()

/**
 * Fetch split data - runs once during SSR/navigation
 */
await callOnce(() => splitsStore.fetchSplit(props.splitId), { mode: 'navigation' })

/**
 * UI Functionality
 */
const sumsUp = computed(() => splitsStore.doesSplitAddUp(props.splitId))
const settledText = computed(() => isSettled.value ? 'Settled Up' : 'Unsettled')
const toggleSettle = () => {
  isSettled.value = !isSettled.value
}

/**
 * Split Refs
 */
const split = computed(() => splitsStore.getSplitById(props.splitId))

// Writable computed refs - all accumulate into pendingUpdates
const splitAmount = computed({
  get: () => split.value?.splitAmount,
  set: (value) => {
    if (value !== '') { // user clears field
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

const userADebt = computed({
  get: () => split.value?.userADebt,
  set: (value) => {
    if (value !== '') { // user clears field
      pendingUpdates.value.userADebt = parseFloat(value)
      debouncedUpdate()
    }
  },
})

const userBDebt = computed({
  get: () => split.value?.userBDebt,
  set: (value) => {
    if (value !== '') { // user clears field
      pendingUpdates.value.userBDebt = parseFloat(value)
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
 * Update Split (debounced & accumulated)
 */
const pendingUpdates = ref({})

// Single debounced update function that flushes accumulated changes
const debouncedUpdate = useDebounceFn(async () => {
  const updates = { ...pendingUpdates.value }
  pendingUpdates.value = {} // Clear accumulator

  try {
    await splitsStore.updateSplit(props.splitId, updates)
  }
  catch (err) {
    showToast(err)
  }
}, 500)

/**
 * ------
 * Styles
 * ------
 */
const settledClass = computed(function () {
  return isSettled.value
    ? 'border-blue-400 text-blue-700 bg-blue-50'
    : 'border-slate-200'
})

const inputBaseClass = computed(function () {
  return (sumsUp.value)
    ? 'text-right'
    : 'text-right border border-orange-400 rounded-md ring-0'
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
  <div>
    <section class="flex justify-between items-center my-2 text-sm">
      <!-- Split Amount -->
      <div class="font-medium">
        Split Amount
      </div>
      <div class="text-right">
        <!-- <ui-saved-inline-alert /> -->
        <span v-if="!sumsUp" class="inline-block mr-2 font-normal text-orange-500">
          Shares do not add up to this.
        </span>
        <UInput
          v-model="splitAmount"
          name="splitAmount"
          trailing-icon="i-lucide-euro"
          class="w-24"
          :ui="{ base: inputBaseClass, trailingIcon: 'size-4 text-slate-400' }"
        />
      </div>
    </section>

    <!-- Paid by -->
    <section class="flex justify-between items-center my-2 text-sm">
      <div class="font-medium">
        Paid By
        <!-- <ui-saved-inline-alert /> -->
      </div>
      <div class="text-right">
        <receipt-split-paid-by
          v-model="paidBy"
          :users="users"
        />
      </div>
    </section>

    <!-- User A Share -->
    <section class="flex justify-between items-center my-2 text-sm">
      <div class="font-medium">
        {{ user1Name }}'s Share
      </div>
      <div class="text-right">
        <!-- <ui-saved-inline-alert /> -->
        <!-- i-ic-outline-euro-symbol -->
        <UInput
          v-model="userADebt"
          name="userADebt"
          trailing-icon="i-lucide-euro"
          class="w-24"
          :ui="{ base: inputBaseClass, trailingIcon: 'size-4 text-slate-400' }"
        />
      </div>
    </section>

    <!-- User B Share -->
    <section class="flex justify-between items-center my-2 text-sm">
      <div class="font-medium">
        {{ user2Name }}'s Share
      </div>
      <div class="text-right">
        <UInput
          v-model="userBDebt"
          name="userBDebt"
          trailing-icon="i-lucide-euro"
          class="w-24"
          :ui="{ base: inputBaseClass, trailingIcon: 'size-4 text-slate-400' }"
        />
      </div>
    </section>

    <!-- Settle Button -->
    <div class="mt-4 border rounded-md p-3 grid grid-cols-2 cursor-pointer hover:bg-slate-50" :class="settledClass" @click="toggleSettle">
      <div class="text-left">
        <div class="text-sm">
          {{ settledText }}
          <!-- <UIcon name="i-lucide-loader-circle" class="size-5 align-middle text-blue-400 animate-spin" /> -->
          <!-- <UIcon
            name="i-lucide-cloud-check"
            class="size-5 align-middle text-blue-500 transition-opacity transition-discrete ease-in-out duration-300"
            :class="savedIconClasses"
          /> -->
        </div>
      </div>
      <div class="flex justify-end">
        <UCheckbox v-model="isSettled" class="cursor-pointer" />
      </div>
    </div>

    <!-- <div class="text-right">
      <UButton
        color="secondary"
        class="mt-3 cursor-pointer"
        icon="i-lucide-save"
      >
        Update Split
      </UButton>
    </div> -->
  </div>
</template>
