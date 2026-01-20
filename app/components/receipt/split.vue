<script setup>
// const props = defineProps({
// })

const config = useRuntimeConfig()
const user1Name = config.public.splitUserOneName
const user2Name = config.public.splitUserTwoName

// TODO: create store and pull values based on split ID.
const isSettled = ref(false)
const splitAmount = ref('19.50')
const user1Amount = ref('8.75')
const user2Amount = ref('8.75')
const paidBy = ref(null)

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

const savedIconClasses = computed(function () {
  return isSettled.value // TODO
    ? 'opacity-100'
    : 'opacity-0'
})
</script>

<template>
  <div>
    <div class="grid grid-cols-[1fr_2fr] gap-1 items-center text-sm">
      <!-- Split Amount -->
      <div>Split Amount</div>
      <div class="text-right">
        <ui-saved-inline-alert />
        <UInput
          v-model="splitAmount"
          trailing-icon="i-lucide-euro"
          class="w-24"
          :ui="{ base: 'text-right', trailingIcon: 'size-4 text-slate-400' }"
        />
      </div>

      <!-- Paid by -->
      <div>Paid By</div>
      <div class="text-right">
        <receipt-split-paid-by v-model="paidBy" />
      </div>

      <!-- User 1 Owes -->
      <div>{{ user1Name }} owes</div>
      <div class="text-right">
        <!-- <ui-saved-inline-alert /> -->
        <!-- i-ic-outline-euro-symbol -->
        <UInput
          v-model="user1Amount"
          trailing-icon="i-lucide-euro"
          class="w-24"
          :ui="{ base: 'text-right', trailingIcon: 'size-4 text-slate-400' }"
        />
      </div>

      <!-- User 2 Owes -->
      <div>{{ user2Name }} owes</div>
      <div class="text-right">
        <!-- <ui-saved-inline-alert /> -->
        <UInput
          v-model="user2Amount"
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
          <UIcon
            name="i-lucide-cloud-check"
            class="size-5 align-middle text-blue-500 transition-opacity transition-discrete ease-in-out duration-300"
            :class="savedIconClasses"
          />
        </div>
      </div>
      <div class="flex justify-end">
        <UCheckbox v-model="isSettled" class="cursor-pointer" />
      </div>
    </div>
  </div>
</template>
