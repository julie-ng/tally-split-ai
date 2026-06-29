<script setup>
import { useHouseholdStore } from '~/stores/household.store'

const householdStore = useHouseholdStore()

useHead({
  title: 'Household Members',
})

const actionItems = ref([
  {
    label: 'Edit',
    icon: 'i-lucide-edit-2',
    to: `/households/${householdStore.id}/edit`,
  },
  {
    label: 'Delete',
    icon: 'i-lucide-trash-2',
    disabled: true,
  },
])
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="householdStore.name ?? 'Household'">
        <template #left>
          <UBreadcrumb
            :items="[
              { label: 'Households', class: 'font-semibold text-default' },
              { label: householdStore.name ?? '...', to: $route.path },
            ]"
          />
        </template>
        <template #right>
          <UDropdownMenu :items="actionItems">
            <UButton
              icon="i-lucide-more-vertical"
              color="neutral"
              variant="ghost"
            />
          </UDropdownMenu>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div>
        <h1 class="text-2xl mb-1 font-bold">
          {{ householdStore.name }}
        </h1>
        <p v-if="householdStore.description" class="text-dimmed text-sm">
          {{ householdStore.description }}
        </p>
      </div>

      <household-members-list />

      <household-add-member-form />

      <household-llm-consent />

      <household-custom-instructions />
    </template>
  </UDashboardPanel>
</template>
