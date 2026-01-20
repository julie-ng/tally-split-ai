<script setup>
defineProps({
  receiptId: {
    type: Number,
    required: false, // TODO: make true
  },
})

const emit = defineEmits(['update:modelValue'])

// Temporary until auth is implemented
const config = useRuntimeConfig()
const user1Name = config.public.splitUserOneName
const user2Name = config.public.splitUserTwoName
const user1Id = config.public.splitUserOneId
const user2Id = config.public.splitUserTwoId

const paidBy = ref(null)
const items = ref([
  {
    label: `${user1Name} paid`,
    value: user1Id,
  },
  {
    label: `${user2Name} paid`,
    value: user2Id,
  },
])

// Watch for changes and emit to parent
watch(paidBy, (newValue) => {
  emit('update:modelValue', newValue)
})
</script>

<template>
  <div class="inline-flex text-center">
    <URadioGroup
      v-model="paidBy"
      name="paidBy"
      :items="items"
      orientation="horizontal"
      variant="card"
      :ui="{ item: 'px-3 py-2 w-34 cursor-pointer hover:bg-slate-100 has-data-[state=checked]:bg-blue-50 has-data-[state=checked]:border-blue-300' }"
    />
  </div>
</template>
