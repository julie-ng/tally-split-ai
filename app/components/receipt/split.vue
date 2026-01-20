<script setup>
import { useDebounceFn } from '@vueuse/core'
import { useSplitsStore } from '~/stores/splits.store'

const props = defineProps({
  splitId: {
    type: Number,
    required: true,
  },
  // receiptId: {
  //   type: Number,
  //   required: false,
  // },
})

const toast = useToast()
const splitsStore = useSplitsStore()
const config = useRuntimeConfig()
const user1Name = config.public.splitUserOneName
const user2Name = config.public.splitUserTwoName

// Local reactive state for form inputs
const splitAmount = ref(0)
const userADebt = ref(0)
const userBDebt = ref(0)
const paidBy = ref(null)
const isSettled = ref(false)

// Fetch split data on mount and populate form
onMounted(async () => {
  try {
    const split = await splitsStore.fetchSplit(props.splitId)
    if (split) {
      splitAmount.value = split.splitAmount || 0
      userADebt.value = split.userADebt || 0
      userBDebt.value = split.userBDebt || 0
      paidBy.value = split.paidBy
      isSettled.value = split.isSettled || false
    }
  }
  catch (err) {
    console.error('Failed to load split:', err)
    toast.add({
      title: 'Error loading split',
      description: err.message || 'Failed to load split data',
      color: 'red',
      timeout: 5000,
    })
  }
})

// Watch for store updates and sync to form
const split = computed(() => splitsStore.getSplitById(props.splitId))
watch(split, (newSplit) => {
  if (newSplit) {
    splitAmount.value = newSplit.splitAmount || 0
    userADebt.value = newSplit.userADebt || 0
    userBDebt.value = newSplit.userBDebt || 0
    paidBy.value = newSplit.paidBy
    isSettled.value = newSplit.isSettled || false
  }
}, { deep: true })

// Helper to show error toast
function showError (err) {
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

// Watch individual fields and call appropriate store functions
watch(splitAmount, useDebounceFn(async (newValue, oldValue) => {
  if (newValue !== oldValue && newValue) {
    const amount = parseFloat(newValue)
    if (!isNaN(amount)) {
      try {
        await splitsStore.updateSplitAmount(props.splitId, amount)
      }
      catch (err) {
        showError(err)
      }
    }
  }
}, 500))

watch(paidBy, useDebounceFn(async (newValue, oldValue) => {
  if (newValue !== oldValue) {
    try {
      await splitsStore.updatePaidBy(props.splitId, newValue)
    }
    catch (err) {
      showError(err)
    }
  }
}, 500))

watch(isSettled, useDebounceFn(async (newValue, oldValue) => {
  if (newValue !== oldValue) {
    try {
      await splitsStore.updateIsSettled(props.splitId, newValue)
    }
    catch (err) {
      showError(err)
    }
  }
}, 500))

// Debt fields: update one, calculate the other
// TODO: Need to determine proper userId mapping (user1 vs userA)
watch(userADebt, useDebounceFn(async (newValue, oldValue) => {
  if (newValue !== oldValue && newValue) {
    const amount = parseFloat(newValue)
    if (!isNaN(amount)) {
      try {
        await splitsStore.updateDebt(props.splitId, { userId: 'user1', amount })
      }
      catch (err) {
        showError(err)
      }
    }
  }
}, 500))

watch(userBDebt, useDebounceFn(async (newValue, oldValue) => {
  if (newValue !== oldValue && newValue) {
    const amount = parseFloat(newValue)
    if (!isNaN(amount)) {
      try {
        await splitsStore.updateDebt(props.splitId, { userId: 'user2', amount })
      }
      catch (err) {
        showError(err)
      }
    }
  }
}, 500))

// Status indicators
const isSaving = computed(function () {
  const result = splitsStore.isSplitSaving(props.splitId)
  if (result) {
    console.log(`Saving ${props.splitId}…`, result)
  }
  return result
})
const error = computed(() => splitsStore.getSplitError(props.splitId))

const settledText = computed(() => isSettled.value ? 'Settled Up' : 'Unsettled')
const toggleSettle = () => {
  isSettled.value = !isSettled.value
}

/**
 * Styles
 */
const settledClass = computed(function () {
  return isSettled.value
    ? 'border-blue-400 text-blue-700 bg-blue-50'
    : 'border-slate-200'
})

// const savedIconClasses = computed(function () {
//   return !isSaving.value && !error.value
//     ? 'opacity-100'
//     : 'opacity-0'
// })
</script>

<template>
  <div>
    <div class="grid grid-cols-[1fr_2fr] gap-1 items-center text-sm">
      <!-- <div>Is Saving?</div>
      <div>{{ isSaving }}</div> -->
      <!-- Split Amount -->
      <div>Split Amount</div>
      <div class="text-right">
        <!-- <ui-saved-inline-alert /> -->
        <UInput
          v-model="splitAmount"
          trailing-icon="i-lucide-euro"
          class="w-24"
          :ui="{ base: 'text-right', trailingIcon: 'size-4 text-slate-400' }"
        />
      </div>

      <!-- Paid by -->
      <div>
        Paid By
        <!-- <ui-saved-inline-alert /> -->
      </div>
      <div class="text-right">
        <receipt-split-paid-by v-model="paidBy" />
      </div>

      <!-- User A Owes -->
      <div>{{ user1Name }} owes</div>
      <div class="text-right">
        <!-- <ui-saved-inline-alert /> -->
        <!-- i-ic-outline-euro-symbol -->
        <UInput
          v-model="userADebt"
          trailing-icon="i-lucide-euro"
          class="w-24"
          :ui="{ base: 'text-right', trailingIcon: 'size-4 text-slate-400' }"
        />
      </div>

      <!-- User B Owes -->
      <div>{{ user2Name }} owes</div>
      <div class="text-right">
        <!-- <ui-saved-inline-alert /> -->
        <UInput
          v-model="userBDebt"
          trailing-icon="i-lucide-euro"
          class="w-24"
          :ui="{ base: 'text-right', trailingIcon: 'size-4 text-slate-400' }"
        />
      </div>
    </div>

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
