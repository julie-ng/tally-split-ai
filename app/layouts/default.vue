<script setup>
import { useUserStore } from '~/stores/user.store'
import { useHouseholdStore } from '~/stores/household.store'

const userStore = useUserStore()
const householdStore = useHouseholdStore()
const { loggedIn } = useUserSession()

// Fetch household once per navigation. Hydrates on the server so child
// components/pages can read members synchronously.
if (loggedIn.value) {
  await useAsyncData('household', () => householdStore.fetch())
}

const route = useRoute()

function isActive (path) {
  return route.path === path || route.path.startsWith(path + '/')
}

const splitMonths = useSplitMonths()
const logout = useLogout()

const userMenuItems = computed(() => [
  [
    {
      label: 'Profile',
      icon: 'i-lucide-user',
      to: '/profile',
    },
    {
      label: 'Logout',
      icon: 'i-lucide-log-out',
      onSelect: () => logout(),
    },
  ],
])

function getLinks (collapsed) {
  const expanded = !collapsed
  return [
    [
      {
        label: 'Dashboard',
        icon: 'i-lucide-bar-chart-3',
        to: '/dashboard',
        active: isActive('/dashboard'),
      },
      {
        label: 'Household',
        icon: 'i-lucide-users',
        to: householdStore.path,
        active: isActive('/households'),
      },
      {
        label: 'Receipts',
        icon: 'i-lucide-receipt-euro',
        to: '/receipts',
        active: isActive('/receipts'),
      },
      {
        label: 'Splits',
        icon: 'i-lucide-coins',
        to: '/splits',
        active: isActive('/splits'),
        // defaultOpen: true,
        children: expanded ? splitMonths : [],
      },
      {
        label: 'Uploads',
        icon: 'i-lucide-upload-cloud',
        to: '/uploads',
        active: isActive('/uploads'),
      },
    ],
    [
      {
        label: 'JSON APIs',
        icon: 'i-lucide-braces',
        defaultOpen: false,
        active: false,
        children: expanded
          ? [
              { label: 'blobs/', to: '/api/blobs/', external: true, target: '_blank' },
              { label: 'receipts/', to: '/api/receipts/', external: true, target: '_blank' },
              { label: 'receipts/[id]', to: '/api/receipts/1', external: true, target: '_blank' },
              { label: 'tokens/read', to: '/api/tokens/read', external: true, target: '_blank' },
              { label: 'tokens/upload', to: '/api/tokens/upload', external: true, target: '_blank' },
              { label: 'uploads/', to: '/api/uploads/', external: true, target: '_blank' },
              { label: 'uploads/[hashId]', to: '/api/uploads/7aaaa195168e', external: true, target: '_blank' },
            ]
          : [],
      },
    ],
  ]
}
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar
      collapsible
      :ui="{
        root: 'bg-muted',
        footer: 'border-t border-default',
      }"
    >
      <template #header="{ collapsed }">
        <UButton
          v-if="!collapsed"
          to="/"
          icon="i-lucide-scan-barcode"
          label="TallySplit AI"
          color="neutral"
          variant="ghost"
          square
          class="overflow-hidden"
          :ui="{ leadingIcon: 'text-blue-600' }"
        />
        <UDashboardSidebarCollapse variant="ghost" class="ms-auto opacity-60 hover:opacity-100 transition-opacity" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :key="String(collapsed)"
          :collapsed="collapsed"
          :items="getLinks(collapsed)"
          orientation="vertical"
          :ui="{ link: 'p-1.5 overflow-hidden' }"
        />
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu :items="userMenuItems" :ui="{ content: 'w-48' }">
          <UButton
            color="neutral"
            variant="ghost"
            :square="collapsed"
            :block="!collapsed"
            class="overflow-hidden"
            trailing-icon="i-lucide-chevrons-up-down"
            :class="collapsed ? '' : 'justify-start'"
            :ui="{
              trailingIcon: 'opacity-40',
            }"
          >
            <UAvatar
              :src="userStore.avatarUrl"
              :alt="userStore.displayName"
              size="xs"
            />
            <span v-if="!collapsed" class="truncate">{{ userStore.displayName }}</span>
          </UButton>
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
