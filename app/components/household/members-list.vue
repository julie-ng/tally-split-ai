<script setup>
import { useHouseholdStore } from '~/stores/household.store'

const householdStore = useHouseholdStore()
</script>

<template>
  <section class="mb-4">
    <h2 class="font-semibold text-lg mb-1">
      Current members
    </h2>
    <p class="text-dimmed text-sm mb-6">
      Showing {{ householdStore.members.length }} of 2 members.
    </p>
    <div class="grid gap-3 max-w-2xl">
      <div
        v-for="member in householdStore.members"
        :key="member.id"
        class="flex items-center gap-3 p-3 border border-slate-200 rounded-md bg-white"
      >
        <UAvatar :src="member.avatarUrl" :alt="member.username" size="md" />
        <div class="flex-1">
          <div class="font-medium">
            <NuxtLink :to="`/users/${member.id}`">
              {{ member.displayName ?? member.username }}
            </NuxtLink>
          </div>
          <div class="text-sm text-dimmed">
            @{{ member.username }} · {{ member.initials }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
