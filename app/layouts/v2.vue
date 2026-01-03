<script setup>
const navItems = [
  {
    label: 'Home',
    icon: 'i-lucide-home',
    to: '/'
  },
  {
    label: 'Blobs',
    icon: 'i-lucide-blocks',
    to: '/blobs'
  },
  {
    label: 'Uploads',
    icon: 'i-lucide-upload',
    to: '/uploads'
  },
]
</script>
<template>
  <UApp>
    <UHeader title="AI Receipts" />
    <img src="/images/logo-dark.svg" alt="Logo" class="mr-2" style="width: 20px">
    <UNavigationMenu
      orientation="vertical"
     :items="navItems"
     class="data-[orientation=vertical]:w-48" />

    <UMain>
      <slot />
    </UMain>
  </UApp>
</template>
