<script setup>
const config = useRuntimeConfig()
const user1Name = config.public.splitUserOneName
const user2Name = config.public.splitUserTwoName

// const props = defineProps({
// })
const isSettled = ref(true)
const splitAmount = ref('19.50')
const user1Amount = ref('8.75')
const user2Amount = ref('8.75')

const settledText = computed(() => isSettled.value ? 'Settled Up' : 'Unsettled')

const settledClass = computed(function () {
  return isSettled.value
    ? 'border-emerald-400 text-emerald-700 bg-emerald-50'
    : 'border-slate-200'
})

const savedIconClasses = computed(function () {
  return isSettled.value // TODO
    ? 'opacity-100'
    : 'opacity-0'
})

const toggleSettle = () => {
  isSettled.value = !isSettled.value
}
</script>

<template>
  <div>
    <section class=" bg-slate-50 p-3 text-center">
      <h3 class="text-sm">
        Split Amount
      </h3>
      <UInput v-model="splitAmount" class="mt-1 w-24" :ui="{ base: 'text-center' }" />

      <div class="my-3 text-center">
        <div class="grid grid-cols-2 gap-3">
          <div class="border border-slate-200 bg-slate-100 rounded-md p-3">
            <!-- <UAvatar alt="J N" size="sm" :ui="{ root: 'bg-orange-400', fallback: 'text-white' }" /> -->
            <h3 class="text-sm">
              {{ user1Name }} owes
            </h3>
            <!-- <p>8.75 EUR</p> -->
            <UInput v-model="user1Amount" class="mt-1 w-24" :ui="{ base: 'text-center' }" />
          </div>
          <div class="border border-slate-200 bg-slate-100 rounded-md p-3">
            <!-- <UAvatar alt="M M" size="sm" :ui="{ root: 'bg-blue-500', fallback: 'text-white' }" /> -->
            <h3 class="text-sm text-slate-500">
              {{ user2Name }} owes
            </h3>
            <!-- <p>8.75 EUR</p> -->
            <UInput v-model="user2Amount" class="mt-1 w-24" :ui="{ base: 'text-center' }" />
            <!-- EUR -->
          </div>
        </div>
        <div class="mt-4 border rounded-md p-3 grid grid-cols-2 cursor-pointer hover:bg-slate-50" :class="settledClass" @click="toggleSettle">
          <div class="text-left">
            <div class="text-sm">
              {{ settledText }}
              <!-- <UIcon name="i-lucide-loader-circle" class="size-5 align-middle text-indigo-400 animate-spin2" /> -->

              <UIcon
                name="i-lucide-circle-check"
                class="size-5 align-middle text-emerald-500 transition-opacity transition-discrete ease-in-out duration-300"
                :class="savedIconClasses"
              />
            </div>
          </div>
          <div class="flex justify-end">
            <UCheckbox v-model="isSettled" class="cursor-pointer" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
