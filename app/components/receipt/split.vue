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
splitsStore.debug = true

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
 * Fetch split data — self-managed, works in both SSR and client-side navigation
 */
const splitLoading = computed(() => splitsStore.isSplitLoading(props.splitId))
splitsStore.fetchSplit(props.splitId)

/**
 * UI Functionality
 */
const sumsUp = computed(() => splitsStore.doesSplitAddUp(props.splitId))
const settledText = computed(() => isSettled.value ? 'Settled Up' : 'Unsettled')
const toggleSettle = () => {
  isSettled.value = !isSettled.value
}

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

const userAShare = computed({
  get: () => split.value?.userAShare,
  set: (value) => {
    if (value !== '') { // user clears field
      pendingUpdates.value.userAShare = parseFloat(value)
      debouncedUpdate()
    }
  },
})

const userBShare = computed({
  get: () => split.value?.userBShare,
  set: (value) => {
    if (value !== '') { // user clears field
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
  <ClientOnly>
    <!-- Loading state -->
    <template v-if="splitLoading || !split">
      <div class="space-y-3 animate-pulse">
        <div class="h-8 bg-slate-100 rounded" />
        <div class="h-8 bg-slate-100 rounded" />
        <div class="h-8 bg-slate-100 rounded" />
        <div class="h-8 bg-slate-100 rounded" />
      </div>
    </template>

    <div v-else>
      <!-- Split Amount -->
      <receipt-split-input
        v-model="splitAmount"
        :sums-up="sumsUp"
        label="Split Amount"
        input-name="splitAmount"
        :highlight-on-success="true"
      >
        <template v-if="sumsUp" #success>
          Shares add up
        </template>
        <template v-if="!sumsUp" #warn>
          Shares do not add up
        </template>
      </receipt-split-input>

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
      <receipt-split-input
        v-model="userAShare"
        :label="`${user1Name}'s Share`"
        :sums-up="sumsUp"
        input-name="userAShare"
      />

      <!-- User B Share -->
      <receipt-split-input
        v-model="userBShare"
        :label="`${user2Name}'s Share`"
        :sums-up="sumsUp"
        input-name="userBShare"
      />

      <!-- Settle Button -->
      <div class="mt-4 border rounded-md p-3 grid grid-cols-2 cursor-pointer hover:bg-slate-50" :class="settledClass" @click="toggleSettle">
        <div class="text-left">
          <div class="text-sm">
            {{ settledText }}
          </div>
        </div>
        <div class="flex justify-end">
          <UCheckbox v-model="isSettled" class="cursor-pointer" />
        </div>
      </div>

      <div class="flex justify-between items-center mt-3 text-sm">
        <div>Reset</div>
        <div>
          <UButton
            variant="solid"
            color="neutral"
            class="mr-2 cursor-pointer"
            icon="i-lucide-zap"
            @click="splitHalf"
          >
            Split 50/50
          </UButton>
          <UButton
            variant="solid"
            color="neutral"
            class="cursor-pointer"
            icon="i-lucide-eraser"
            @click="zeroOut"
          >
            Reset to zero
          </UButton>
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
  </ClientOnly>
</template>
