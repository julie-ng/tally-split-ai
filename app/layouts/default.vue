<script setup lang="ts">
import { useUserStore } from '~/stores/user.store'

const store = useUserStore()
// const userFullName = store.fullName
const userId = store.userId

const route = useRoute()
// const toast = useToast()
const open = ref(false)

const collapsed = ref(false)

function isActive (path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}

const links = computed(() => [
  [
    {
      label: 'Blobs',
      icon: 'i-lucide-blocks',
      to: '/blobs',
    },
  ],
  [
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
    },
    {
      label: 'Uploads',
      icon: 'i-lucide-upload-cloud',
      to: '/uploads',
      active: isActive('/uploads'),
      defaultOpen: true,
      children: [
        {
          label: 'List',
          to: '/uploads',
          icon: 'i-lucide-list',
          onSelect: () => {
            open.value = false
          },
        },
        {
          label: 'New Upload',
          icon: 'i-lucide-upload',
          to: '/uploads/new',
        },
      ],
    },
  ],
  [
    {
      label: 'JSON APIs',
      icon: 'i-lucide-braces',
      to: '/uploads',
      defaultOpen: true,
      children: [
        {
          label: 'blobs/',
          to: '/api/blobs/',
          external: true,
          target: '_blank',
        },
        {
          label: 'receipts/',
          to: '/api/receipts/',
          external: true,
          target: '_blank',
        },
        {
          label: 'receipts/[id]',
          to: '/api/receipts/1',
          external: true,
          target: '_blank',
        },
        {
          label: 'tokens/read',
          to: '/api/tokens/read',
          external: true,
          target: '_blank',
        },
        {
          label: 'tokens/upload',
          to: '/api/tokens/upload',
          external: true,
          target: '_blank',
        },
        {
          label: 'uploads/',
          to: '/api/uploads/',
          external: true,
          target: '_blank',
        },
        {
          label: 'uploads/[hashId]',
          to: '/api/uploads/7aaaa195168e',
          external: true,
          target: '_blank',
        },
      ],
    },
  ],
])
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar
      id="default"
      v-model:collapsed="collapsed"
      :default-size="12"
      :min-size="12"
      :max-size="15"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ header: 'lg:border-b lg:border-default', footer: 'lg:border-t lg:border-default' }"
    >
      <!-- Header -->
      <template #header="{ collapsed }">
        <NuxtLink class="flex items-center" :class="{ 'py-1 px-1 bg-blue-600 rounded-sm': collapsed }" to="/">
          <UIcon name="i-lucide-scan-barcode" class="size-6" :class="{ 'bg-white': collapsed, 'bg-blue-600 ml-2': !collapsed }" />
          <div v-if="!collapsed" class="px-2 font-semibold text-slate-700">
            Receipts AI
          </div>
        </NuxtLink>
      </template>

      <!-- Navigation Menu -->
      <template #default="{ collapsed }">
        <UNavigationMenu :collapsed="collapsed" :items="links" orientation="vertical" />
      </template>

      <!-- User Icon -->
      <template #footer="{ collapsed }">
        <div class="flex items-center py-1" :class="{ 'px-1': collapsed }">
          <div class="inline-flex p-1 items-center justify-center rounded-full bg-slate-200">
            <UIcon name="i-lucide-user-round" class="size-4 text-slate-400 bg-slate-500" />
          </div>
          <div v-if="!collapsed" class="pl-2 text-sm text-slate-500">
            {{ userId }}
          </div>
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel id="main" class="overflow-scroll">
      <slot />
    </UDashboardPanel>

    <!-- <NotificationsSlideover /> -->
  </UDashboardGroup>
</template>
