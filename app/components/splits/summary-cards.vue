<script setup>
import { useHouseholdStore } from '~/stores/household.store'
import { useUserStore } from '~/stores/user.store'
import { useHouseholdMember } from '~/composables/useHouseholdMember'

const props = defineProps({
  summary: {
    type: Object,
    default: null,
  },
})

const householdStore = useHouseholdStore()
const userStore = useUserStore()
const user1 = useHouseholdMember(() => householdStore.userOne?.id)
const user2 = useHouseholdMember(() => householdStore.userTwo?.id)

const isLoggedInUserOne = computed(() => userStore.userId === user1.value?.id)

const otherUserFirstName = computed(() =>
  isLoggedInUserOne.value ? user2.value?.firstName : user1.value?.firstName,
)

// netBalance > 0 means userTwo owes userOne; < 0 means userOne owes userTwo.
// null when even (no direction).
const loggedInIsOwed = computed(() => {
  if (!props.summary || props.summary.netBalance === 0) {
    return null
  }
  const userOneIsOwed = props.summary.netBalance > 0
  return isLoggedInUserOne.value ? userOneIsOwed : !userOneIsOwed
})

const netBalanceText = computed(() => {
  if (loggedInIsOwed.value === null) {
    return 'Even'
  }
  return loggedInIsOwed.value
    ? `${otherUserFirstName.value} owes you`
    : `You owe ${otherUserFirstName.value}`
})

const netBalanceColor = computed(() => {
  if (loggedInIsOwed.value === null) {
    return 'text-gray-600'
  }
  if (!isComplete.value) {
    return 'text-warning'
  }
  return loggedInIsOwed.value
    ? 'text-emerald-600'
    : 'text-red-600'
})

const isComplete = computed(() => {
  return props.summary.pendingCount === 0 && props.summary.unattributedCount === 0
})
</script>

<template>
  <div v-if="summary" class="grid grid-cols-5 gap-4 mb-5">
    <split-card
      :title="receiptUtils.formatCurrency(summary.userOneShare, 'EUR')"
    >
      <template #subtitle>
        <div class="flex items-center gap-1.5 mb-0.5">
          <UAvatar :src="user1?.avatarUrl" size="2xs" />
          <span>{{ user1?.firstName }}'s Share</span>
        </div>
      </template>
    </split-card>
    <split-card
      :title="receiptUtils.formatCurrency(summary.userTwoShare, 'EUR')"
    >
      <template #subtitle>
        <div class="flex items-center gap-1.5 mb-0.5">
          <UAvatar :src="user2?.avatarUrl" size="2xs" />
          <span>{{ user2?.firstName }}'s Share</span>
        </div>
      </template>
    </split-card>

    <split-card>
      <template #subtitle>
        <div class="flex items-center gap-1">
          <span>{{ netBalanceText }}</span>
          <UPopover v-if="!isComplete" arrow mode="hover">
            <UButton
              icon="i-lucide-circle-alert"
              color="warning"
              variant="ghost"
              size="xs"
            />
            <template #content>
              <div class="p-4 text-sm">
                <h1 class="font-semibold">
                  Incomplete results
                </h1>
                <p>
                  Ensure all receipts have attributed payers
                </p>
              </div>
            </template>
          </UPopover>
        </div>
      </template>
      <template #title>
        <div :class="netBalanceColor">
          {{ receiptUtils.formatCurrency(Math.abs(summary.netBalance), 'EUR') }}
        </div>
      </template>
    </split-card>
    <!-- <split-card
      :title="`${summary.pendingCount} receipts`"
      :note="`Analysis pending`"
      subtitle="Incomplete"
    /> -->
    <split-card
      :title="`${summary.unsettledCount} receipts`"
      note="Not yet paid back"
      subtitle="Unsettled"
    />
    <split-card
      :title="`${summary.unattributedCount} payers`"
      :note="summary.unattributedCount > 0
        ? `${receiptUtils.formatCurrency(summary.unattributedAmount, 'EUR')} unattributed`
        : null"
      subtitle="Unidentified"
    />
  </div>
</template>
