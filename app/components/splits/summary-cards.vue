<script setup>
import { useHouseholdStore } from '~/stores/household.store'

defineProps({
  summary: {
    type: Object,
    default: null,
  },
})

const householdStore = useHouseholdStore()
const user1Name = computed(() => householdStore.getMemberFirstName(householdStore.userOne?.id))
const user2Name = computed(() => householdStore.getMemberFirstName(householdStore.userTwo?.id))

function netBalanceText (s) {
  if (s.netBalance === 0) {
    return 'Even'
  }
  return s.netBalance > 0
    ? `${user2Name.value} owes ${user1Name.value}`
    : `${user1Name.value} owes ${user2Name.value}`
}
</script>

<template>
  <div v-if="summary" class="grid grid-cols-5 gap-4 mb-5">
    <split-card
      :title="receiptUtils.formatCurrency(summary.userOneShare, 'EUR')"
      :subtitle="`${user1Name}'s Share`"
    />
    <split-card
      :title="receiptUtils.formatCurrency(summary.userTwoShare, 'EUR')"
      :subtitle="`${user2Name}'s Share`"
    />
    <split-card
      :title="receiptUtils.formatCurrency(Math.abs(summary.netBalance), 'EUR')"
      :note="netBalanceText(summary)"
      subtitle="Net Balance"
    />
    <split-card
      :title="summary.unsettledCount"
      :note="`${summary.pendingCount} pending`"
      subtitle="Unsettled"
    />
    <split-card
      :title="summary.unattributedCount"
      :note="summary.unattributedCount > 0
        ? `${receiptUtils.formatCurrency(summary.unattributedAmount, 'EUR')} unattributed`
        : null"
      subtitle="Unidentified Payer"
    />
  </div>
</template>
