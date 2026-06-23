<script setup>
import { useUsersStore } from '~/stores/users.store'

const route = useRoute()
const usersStore = useUsersStore()

await useAsyncData(
  () => `user-${route.params.id}`,
  () => usersStore.fetch(route.params.id),
)

useHead({
  title: () => usersStore.user?.displayName ?? usersStore.user?.username ?? 'User',
})
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="usersStore.user?.displayName ?? usersStore.user?.username ?? 'User'">
        <template #left>
          <UBreadcrumb
            :items="[
              { label: 'Users' },
              { label: usersStore.user?.username ?? '...', to: $route.path },
            ]"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="usersStore.user" class="max-w-2xl">
        <div class="flex items-center gap-4 mb-6">
          <UAvatar
            :src="usersStore.user.avatarUrl"
            :alt="usersStore.user.username"
            size="xl"
          />
          <div>
            <p class="text-dimmed">
              @{{ usersStore.user.username }}
            </p>
          </div>
        </div>

        <dl class="flex flex-col gap-4">
          <div>
            <dt class="text-sm text-muted mb-1">
              GitHub Username
            </dt>
            <dd class="text-sm font-medium">
              {{ usersStore.user.username }}
            </dd>
          </div>

          <div>
            <dt class="text-sm text-muted mb-1">
              Display name
            </dt>
            <dd class="text-sm font-medium">
              {{ usersStore.user.displayName ?? '—' }}
            </dd>
          </div>

          <div>
            <dt class="text-sm text-muted mb-1">
              Initials
            </dt>
            <dd class="text-sm font-medium">
              {{ usersStore.user.initials ?? '—' }}
            </dd>
          </div>

          <div v-if="usersStore.user.household">
            <dt class="text-sm text-muted mb-1">
              Household
            </dt>
            <dd class="text-sm font-medium">
              <NuxtLink
                :to="`/households/${usersStore.user.household.id}`"
                class="text-primary hover:underline"
              >
                {{ usersStore.user.household.name }}
              </NuxtLink>
            </dd>
          </div>

          <div>
            <dt class="text-sm text-muted mb-1">
              Receipts uploaded
            </dt>
            <dd class="text-sm font-medium">
              {{ usersStore.user.uploadsCount }}
            </dd>
          </div>

          <div>
            <dt class="text-sm text-muted mb-1">
              Expenses paid
            </dt>
            <dd class="text-sm font-medium">
              {{ usersStore.user.paidCount }}
            </dd>
          </div>
        </dl>
      </div>
    </template>
  </UDashboardPanel>
</template>
