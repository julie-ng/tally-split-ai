<script setup>
useHead({
  title: 'UI Test — Buttons',
})

// Rows = color, columns = variant, inner rows = size. UButton derives all of
// this from props (color / variant / size) — no custom CSS. `info` is a
// built-in Nuxt UI semantic color even though it's not in app.config.js.
const colors = ['primary', 'secondary', 'neutral', 'info', 'success', 'error']
const sizes = ['xl', 'lg', 'md', 'sm', 'xs']

// label + which props each column demonstrates.
const variants = [
  { label: 'Solid', variant: 'solid', cta: true },
  { label: 'Outline', variant: 'outline', cta: true },
  { label: 'Subtle', variant: 'subtle', cta: false },
  { label: 'Soft', variant: 'soft', cta: false },
]

function labelFor (variant) {
  return variant.cta ? 'Call to Action' : `${variant.label} button`
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="UI Test — Buttons">
        <template #left>
          <UBreadcrumb
            :items="[
              { label: 'UI', class: 'font-semibold text-default' },
              { label: 'Buttons', to: $route.path },
            ]"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <h1 class="text-3xl font-bold">
        UI Test — Buttons
      </h1>
      <p class="text-sm text-muted mb-8">
        Every theme color across variants (solid / outline / subtle / soft) and
        sizes (xl → xs). All driven by <code class="font-mono">UButton</code> props.
      </p>

      <section
        v-for="color in colors"
        :key="color"
        class="mb-10"
      >
        <h2 class="text-lg font-semibold text-highlighted capitalize mb-3">
          {{ color }}
        </h2>

        <div class="space-y-3">
          <div
            v-for="size in sizes"
            :key="size"
            class="flex flex-wrap items-center gap-3"
          >
            <UButton
              v-for="variant in variants"
              :key="variant.variant"
              :color="color"
              :variant="variant.variant"
              :size="size"
              :trailing-icon="variant.cta ? 'i-lucide-arrow-right' : undefined"
            >
              {{ labelFor(variant) }}
            </UButton>
          </div>
        </div>
      </section>
    </template>
  </UDashboardPanel>
</template>
