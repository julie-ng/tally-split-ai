<script setup>
useHead({
  title: 'Brand Palette',
})

// Full class names written out so Tailwind v4 statically detects and emits
// them (dynamic `bg-${name}-${n}` strings are NOT scanned). Each stop carries
// its own text color: light tints (≤400) take dark text, dark shades take
// light text — so the label always reads.
//
// All three are 50–900 to align row-for-row. `brand` is a raw @theme palette;
// `secondary` (teal) and `neutral` (mist) are Nuxt UI numbered aliases. The
// numbered aliases only define 50–900 — no 950 — so brand matches that range.
const brand = [
  { shade: 50, bg: 'bg-brand-50', text: 'text-brand-900' },
  { shade: 100, bg: 'bg-brand-100', text: 'text-brand-900' },
  { shade: 200, bg: 'bg-brand-200', text: 'text-brand-900' },
  { shade: 300, bg: 'bg-brand-300', text: 'text-brand-900' },
  { shade: 400, bg: 'bg-brand-400', text: 'text-brand-50' },
  { shade: 500, bg: 'bg-brand-500', text: 'text-brand-50' },
  { shade: 600, bg: 'bg-brand-600', text: 'text-brand-50' },
  { shade: 700, bg: 'bg-brand-700', text: 'text-brand-50' },
  { shade: 800, bg: 'bg-brand-800', text: 'text-brand-50' },
  { shade: 900, bg: 'bg-brand-900', text: 'text-brand-50' },
]

const secondary = [
  { shade: 50, bg: 'bg-secondary-50', text: 'text-secondary-950' },
  { shade: 100, bg: 'bg-secondary-100', text: 'text-secondary-950' },
  { shade: 200, bg: 'bg-secondary-200', text: 'text-secondary-950' },
  { shade: 300, bg: 'bg-secondary-300', text: 'text-secondary-950' },
  { shade: 400, bg: 'bg-secondary-400', text: 'text-secondary-950' },
  { shade: 500, bg: 'bg-secondary-500', text: 'text-secondary-50' },
  { shade: 600, bg: 'bg-secondary-600', text: 'text-secondary-50' },
  { shade: 700, bg: 'bg-secondary-700', text: 'text-secondary-50' },
  { shade: 800, bg: 'bg-secondary-800', text: 'text-secondary-50' },
  { shade: 900, bg: 'bg-secondary-900', text: 'text-secondary-50' },
]

const neutral = [
  { shade: 50, bg: 'bg-neutral-50', text: 'text-neutral-950' },
  { shade: 100, bg: 'bg-neutral-100', text: 'text-neutral-950' },
  { shade: 200, bg: 'bg-neutral-200', text: 'text-neutral-950' },
  { shade: 300, bg: 'bg-neutral-300', text: 'text-neutral-950' },
  { shade: 400, bg: 'bg-neutral-400', text: 'text-neutral-950' },
  { shade: 500, bg: 'bg-neutral-500', text: 'text-neutral-50' },
  { shade: 600, bg: 'bg-neutral-600', text: 'text-neutral-50' },
  { shade: 700, bg: 'bg-neutral-700', text: 'text-neutral-50' },
  { shade: 800, bg: 'bg-neutral-800', text: 'text-neutral-50' },
  { shade: 900, bg: 'bg-neutral-900', text: 'text-neutral-50' },
]

const ramps = [
  { name: 'brand', subtitle: 'primary · 500 = #1347e6', stops: brand },
  { name: 'secondary', subtitle: 'teal', stops: secondary },
  { name: 'neutral', subtitle: 'mist', stops: neutral },
]
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Color Palette">
        <template #left>
          <UBreadcrumb
            :items="[
              { label: 'UI', class: 'font-semibold text-default' },
              { label: 'Colors', to: $route.path },
            ]"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <h1 class="text-3xl font-bold">
        Color Palette
      </h1>
      <p class="text-sm text-muted mb-6">
        Theme ramps, light → dark. Defined in
        <code class="font-mono">app/assets/css/main.css</code> +
        <code class="font-mono">app.config.js</code>.
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl">
        <div v-for="ramp in ramps" :key="ramp.name">
          <div class="mb-2">
            <h2 class="text-sm font-semibold text-highlighted capitalize">
              {{ ramp.name }}
            </h2>
            <p class="text-xs text-muted font-mono">
              {{ ramp.subtitle }}
            </p>
          </div>

          <div class="rounded-lg overflow-hidden border border-default">
            <div
              v-for="stop in ramp.stops"
              :key="stop.shade"
              class="px-3 py-2.5"
              :class="[stop.bg, stop.text]"
            >
              <span class="font-mono text-xs">{{ ramp.name }}-{{ stop.shade }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
