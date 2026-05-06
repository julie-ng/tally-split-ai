<script setup>
defineProps({
  items: {
    type: Array,
    required: true,
  },
  currency: {
    type: String,
    required: false,
    default: '',
  },
})

function notEmpty (str) {
  return str !== '' // && str !== '-' TODO: many empty for now.
}

function extraKeyClasses (key) {
  return key === 'Total' ? 'font-semibold text-sm text-slate-700' : 'text-sm text-slate-500'
}

function extraValueClasses (key) {
  return key === 'Total' ? 'font-semibold text-sm text-slate-700' : 'text-sm'
}
</script>

<template>
  <div>
    <div class="grid grid-cols-2 gap-y-1">
      <template v-for="item, i in items" :key="i">
        <div
          v-if="notEmpty(item.value)"
          :class="extraKeyClasses(item.key)"
        >
          {{ item.key }}
        </div>

        <div
          v-if="notEmpty(item.value)"
          class="text-right"
          :class="extraValueClasses(item.key)"
        >
          <template v-if="currency">
            {{ receiptUtils.formatCurrency(item.value, currency) }}
          </template>
          <template v-else>
            {{ item.value }}
          </template>
        </div>
      </template>
    </div>
  </div>
</template>
