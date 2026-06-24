<script setup>
import { useHouseholdStore } from '~/stores/household.store'

const householdStore = useHouseholdStore()
</script>

<template>
  <section class="mb-6 mt-4 max-w-2xl">
    <h2 class="font-semibold text-lg mb-1">
      Custom AI Instructions
    </h2>
    <p v-if="!householdStore.customInstructions" class="text-dimmed text-sm">
      No custom instructions set. Edit the household to add guidance for the AI when analyzing receipts.
    </p>
    <pre
      v-else
      class="text-sm whitespace-pre-wrap p-3 border border-default rounded-md bg-elevated/50 font-sans"
    >{{ householdStore.customInstructions }}</pre>
  </section>
</template>
