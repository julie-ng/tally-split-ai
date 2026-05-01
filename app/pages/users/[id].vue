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
  <UContainer class="my-5 content">
    <div v-if="usersStore.user" class="max-w-2xl">
      <div class="flex items-center gap-4 mb-6">
        <UAvatar
          :src="usersStore.user.avatarUrl"
          :alt="usersStore.user.username"
          size="xl"
        />
        <div>
          <h1 class="font-bold text-3xl">
            {{ usersStore.user.displayName ?? usersStore.user.username }}
          </h1>
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
            Splits paid
          </dt>
          <dd class="text-sm font-medium">
            {{ usersStore.user.paidCount }}
          </dd>
        </div>
      </dl>
    </div>
  </UContainer>
</template>
