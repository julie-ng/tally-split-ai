<script setup>
import { useDebounceFn } from '@vueuse/core'
import { useSplitsStore } from '~/stores/splits.store'

const props = defineProps({
  receiptId: {
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
 * Fetch split data by receiptId — self-managed, works in both SSR and client-side navigation
 */
const splitId = computed(() => splitsStore.getSplitIdByReceiptId(props.receiptId))
const splitLoading = computed(() => splitsStore.loading[`receipt:${props.receiptId}`] || (splitId.value && splitsStore.isSplitLoading(splitId.value)) || false)
const fetchAttempted = ref(false)
splitsStore.fetchSplitByReceiptId(props.receiptId)
  .then(() => {
    fetchAttempted.value = true
  })
  .catch(() => {
    fetchAttempted.value = true
  })

/**
 * UI Functionality
 */
const sumsUp = computed(() => splitId.value
  ? splitsStore.doesSplitAddUp(splitId.value)
  : false,
)
const settledText = computed(() => isSettled.value ? 'Settled Up' : 'Unsettled')
const canSettle = computed(() => splitId.value ? splitsStore.canSettleSplit(splitId.value) : false)
const toggleSettle = () => {
  if (!canSettle.value && !isSettled.value) {
    toast.add({
      title: 'Cannot settle without paid-by',
      description: 'Identify who paid before marking as settled.',
      color: 'warning',
      icon: 'i-lucide-triangle-alert',
      timeout: 4000,
    })
    return
  }
  isSettled.value = !isSettled.value
}

const zeroOut = () => {
  pendingUpdates.value.splitAmount = 0
  pendingUpdates.value.userOneShare = 0
  pendingUpdates.value.userTwoShare = 0
  pendingUpdates.value.paidByUserId = null
  pendingUpdates.value.isSettled = false
  debouncedUpdate()
}

const splitHalf = () => {
  pendingUpdates.value.userOneShare = split.value?.splitAmount / 2
  pendingUpdates.value.userTwoShare = split.value?.splitAmount / 2
  debouncedUpdate()
}

/**
 * Split Refs
 */
const split = computed(() => splitsStore.getSplitByReceiptId(props.receiptId))
const noSplit = computed(() => fetchAttempted.value && !splitLoading.value && !split.value)

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

const paidByUserId = computed({
  get: () => split.value?.paidByUserId,
  set: (value) => {
    pendingUpdates.value.paidByUserId = value
    debouncedUpdate()
  },
})

const userOneShare = computed({
  get: () => split.value?.userOneShare,
  set: (value) => {
    if (value !== '') { // user clears field
      pendingUpdates.value.userOneShare = parseFloat(value)
      debouncedUpdate()
    }
  },
})

const userTwoShare = computed({
  get: () => split.value?.userTwoShare,
  set: (value) => {
    if (value !== '') { // user clears field
      pendingUpdates.value.userTwoShare = parseFloat(value)
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
    await splitsStore.updateSplit(splitId.value, updates)
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
    <template v-if="splitLoading && !split">
      <div class="space-y-3 animate-pulse">
        <div class="h-8 bg-slate-100 rounded" />
        <div class="h-8 bg-slate-100 rounded" />
        <div class="h-8 bg-slate-100 rounded" />
        <div class="h-8 bg-slate-100 rounded" />
      </div>
    </template>

    <!-- No split assigned -->
    <div v-else-if="noSplit" class="text-sm text-dimmed">
      No split assigned to this receipt
    </div>

    <div v-else-if="split">
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
            v-model="paidByUserId"
            :users="users"
          />
        </div>
      </section>

      <!-- User One Share -->
      <receipt-split-input
        v-model="userOneShare"
        :label="`${user1Name}'s Share`"
        :sums-up="sumsUp"
        input-name="userOneShare"
      />

      <!-- User Two Share -->
      <receipt-split-input
        v-model="userTwoShare"
        :label="`${user2Name}'s Share`"
        :sums-up="sumsUp"
        input-name="userTwoShare"
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

      <USeparator class="my-6" />
      <split-llm-analysis v-if="splitId" :split-id="splitId" />

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
