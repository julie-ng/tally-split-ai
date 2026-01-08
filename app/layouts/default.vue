<script setup lang="ts">
// import type { NavigationMenuItem } from '@nuxt/ui'

import { useUserStore } from '~/stores/user.store'
const store = useUserStore()
const userFullName = store.fullName
const userId = store.userId

const route = useRoute()
// const toast = useToast()

const collapsed = ref(false)
const links = [
  {
    label: 'Home',
    icon: 'i-lucide-house',
    to: '/',
  },
  {
    label: 'Azure AI Debug',
    icon: 'i-lucide-flask-conical',
    to: '/debug-analysis',
  },
  {
    label: 'Blobs',
    icon: 'i-lucide-blocks',
    to: '/blobs',
  },
  {
    label: 'Uploads',
    icon: 'i-lucide-upload-cloud',
    to: '/uploads',
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
      }
    ],
  },
]
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar id="default"
      :default-size="12"
      :min-size="12"
      :max-size="15"
      v-model:collapsed="collapsed"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ header: 'lg:border-b lg:border-default', footer: 'lg:border-t lg:border-default' }">

      <!-- Header -->
      <template #header="{ collapsed }">
        <NuxtLink class="flex items-center" :class="{ 'py-1 px-1 bg-blue-600 rounded-sm': collapsed }" to="/">
          <UIcon name="i-lucide-scan-barcode" class="size-6" :class="{ 'bg-white': collapsed }" />
          <div v-if="!collapsed" class="px-2 font-semibold text-slate-800">
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
