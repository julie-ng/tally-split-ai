<script setup>
import { useExpensesStore } from '~/stores/expenses.store'

const props = defineProps({
  expenseId: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['close'])

const expensesStore = useExpensesStore()
const expense = computed(() => props.expenseId ? expensesStore.getExpenseById(props.expenseId) : null)

function handleClose () {
  emit('close')
}

function onKeydown (event) {
  if (event.key === 'Escape' && props.expenseId) {
    handleClose()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <UDashboardPanel id="expense-detail">
    <template #header>
      <UDashboardNavbar
        title="Receipt"
        :description="expense?.receipt?.merchantName"
      >
        <template #right>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            aria-label="Close"
            @click="handleClose"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="pt-6 px-4">
        <expense-overview v-if="expenseId" :expense-id="expenseId" />
      </div>
    </template>
  </UDashboardPanel>
</template>
