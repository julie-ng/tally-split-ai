<script setup>
// A bordered card whose body collapses. Interface mirrors `<UCard>` — a default
// slot for the body plus header slots — with the header doubling as the toggle.
//
// Header layout is two slots either side of the chevron:
//   #header  flush LEFT   (falls back to the `title` prop)
//   #actions flush RIGHT, immediately before the chevron
//
// Open state can be UNCONTROLLED (`default-open`, this component owns it) or
// CONTROLLED (`v-model:open`, the parent owns it — e.g. an accordion where only
// one card may be open).
//
// No footer slot on purpose — nothing needs one yet. Add it when something does.
defineProps({
  // Fallback for the #header slot.
  title: {
    type: String,
    default: null,
  },
  // Seeds the open state when uncontrolled.
  defaultOpen: {
    type: Boolean,
    default: false,
  },
  // Renders the body inline and makes the header inert — for a card whose
  // content is empty or not worth expanding.
  collapsible: {
    type: Boolean,
    default: true,
  },
})

// `undefined` (not false) when the parent doesn't bind it, which is what lets
// UCollapsible fall back to its own uncontrolled state.
const open = defineModel('open', {
  type: Boolean,
  default: undefined,
})
</script>

<template>
  <div class="rounded-lg border border-default bg-default">
    <UCollapsible
      v-model:open="open"
      :default-open="defaultOpen"
      :disabled="!collapsible"
    >
      <!-- UCollapsible wraps this in a CollapsibleTrigger `as-child`, so it must
           be a SINGLE root element — and Reka supplies the click handler and
           aria-expanded. `open` here is the real state, controlled or not. -->
      <template #default="{ open: isOpen }">
        <component
          :is="collapsible ? 'button' : 'div'"
          :type="collapsible ? 'button' : undefined"
          class="w-full px-4 py-3 text-left"
          :class="collapsible ? 'cursor-pointer' : ''"
        >
          <div class="flex items-center gap-2 min-w-0">
            <slot name="header">
              <p class="text-sm font-medium text-default truncate">
                {{ title }}
              </p>
            </slot>

            <!-- ml-auto flushes this group right regardless of header width. -->
            <div class="ml-auto flex items-center gap-2 shrink-0">
              <slot name="actions" />
              <UIcon
                v-if="collapsible"
                name="i-lucide-chevron-down"
                class="size-4 text-highlighted transition-transform"
                :class="isOpen ? 'rotate-180' : ''"
              />
            </div>
          </div>
        </component>
      </template>

      <!-- IMPORTANT
           - The rule is `border-t` on the BODY, not `divide-y` on the parent.
             Reka keeps CollapsibleContent's wrapper element mounted when closed
             (only the slot content is removed), so a divide rule still rendered
             and a collapsed card grew a second line along its bottom edge.
           - The card owns body padding, like UCard, so callers pass bare content
             and every card is spaced identically. -->
      <template #content>
        <div class="border-t border-default px-4 py-4">
          <slot />
        </div>
      </template>
    </UCollapsible>
  </div>
</template>
