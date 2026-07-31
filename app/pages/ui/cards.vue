<script setup>
// Living reference for <UiCollapsibleCard> — every slot + open-state variation,
// so we can SEE what's available and copy the exact call.
useHead({
  title: 'Cards',
})

// Controlled example: the parent owns which card is open, so only one can be.
const openCard = ref('first')
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Cards">
        <template #left>
          <UBreadcrumb
            :items="[
              { label: 'UI', class: 'font-semibold text-default' },
              { label: 'Cards', to: $route.path },
            ]"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <h1 class="text-3xl font-bold">
        Cards
      </h1>
      <p class="text-sm text-muted mb-8 max-w-2xl">
        <code class="font-mono">&lt;UiCollapsibleCard&gt;</code> is a bordered card
        whose body collapses. The interface mirrors
        <code class="font-mono">&lt;UCard&gt;</code>: a default slot for the body,
        plus header slots. The header doubles as the toggle.
      </p>

      <!-- ── Header slots ─────────────────────────────────────────────────── -->
      <section class="mb-12">
        <h2 class="text-sm font-semibold text-highlighted mb-1">
          Header slots
        </h2>
        <p class="text-xs text-muted mb-4 max-w-2xl">
          <code class="font-mono">#header</code> is flush left,
          <code class="font-mono">#actions</code> flush right immediately before
          the chevron. <code class="font-mono">#header</code> falls back to the
          <code class="font-mono">title</code> prop.
        </p>

        <div class="space-y-3 max-w-2xl">
          <UiCollapsibleCard title="Title prop only" default-open>
            <div class="text-sm text-muted">
              Body content. The <code class="font-mono">title</code> prop is the
              fallback when no <code class="font-mono">#header</code> is given.
            </div>
          </UiCollapsibleCard>

          <UiCollapsibleCard>
            <template #header>
              <p class="text-sm font-medium text-default truncate">
                Custom header slot
              </p>
              <UBadge color="neutral" variant="subtle" size="sm">
                inline
              </UBadge>
            </template>
            <template #actions>
              <UiStatusLabel type="subtle" status="completed" />
            </template>
            <div class="text-sm text-muted">
              <code class="font-mono">#header</code> can hold several elements —
              they stay grouped on the left.
            </div>
          </UiCollapsibleCard>
        </div>
      </section>

      <!-- ── Open state ───────────────────────────────────────────────────── -->
      <section class="mb-12">
        <h2 class="text-sm font-semibold text-highlighted mb-1">
          Open state
        </h2>
        <p class="text-xs text-muted mb-4 max-w-2xl">
          Uncontrolled by default — pass
          <code class="font-mono">default-open</code> to start expanded. Bind
          <code class="font-mono">v-model:open</code> to control it from the
          parent (e.g. an accordion where only one may be open).
        </p>

        <div class="space-y-3 max-w-2xl">
          <UiCollapsibleCard title="Closed by default">
            <div class="text-sm text-muted">
              Default behaviour.
            </div>
          </UiCollapsibleCard>

          <UiCollapsibleCard title="Open by default" default-open>
            <div class="text-sm text-muted">
              <code class="font-mono">default-open</code>.
            </div>
          </UiCollapsibleCard>

          <UiCollapsibleCard title="Not collapsible" :collapsible="false">
            <div class="text-sm text-muted">
              <code class="font-mono">:collapsible="false"</code> — body always
              shown, no chevron, header is not a button.
            </div>
          </UiCollapsibleCard>
        </div>
      </section>

      <!-- ── Controlled / accordion ───────────────────────────────────────── -->
      <section class="mb-12">
        <h2 class="text-sm font-semibold text-highlighted mb-1">
          Controlled (accordion)
        </h2>
        <p class="text-xs text-muted mb-4 max-w-2xl">
          The parent owns the open state, so only one card is expanded at a time.
        </p>

        <div class="space-y-3 max-w-2xl">
          <UiCollapsibleCard
            v-for="key in ['first', 'second', 'third']"
            :key="key"
            :title="`The ${key} one`"
            :open="openCard === key"
            @update:open="openCard = $event ? key : null"
          >
            <div class="text-sm text-muted">
              Opening this one closes the others.
            </div>
          </UiCollapsibleCard>
        </div>
      </section>
    </template>
  </UDashboardPanel>
</template>
