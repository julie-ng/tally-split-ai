<script setup>
const model = defineModel({
  required: true,
  type: [String, null],
})
const props = defineProps({
  users: {
    type: Array,
    required: true,
  },
})

const items = []
for (const u of props.users) {
  items.push({
    label: u.name,
    value: u.id,
  })
}
items.push({
  label: 'Unsure',
  value: null,
})
</script>

<template>
  <div class="inline-flex text-center">
    <URadioGroup
      v-model="model"
      name="paidBy"
      :items="items"
      orientation="horizontal"
      variant="card"
      :ui="{ item: 'px-3 py-2 w-24 cursor-pointer hover:bg-elevated has-data-[state=checked]:bg-blue-50 has-data-[state=checked]:border-blue-300' }"
    />
  </div>
</template>
