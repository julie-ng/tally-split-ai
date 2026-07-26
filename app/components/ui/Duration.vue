<script setup>
// <UiDuration> — the inline "· 1m 4s" trailing time shown beside a status. A
// separate component from <UiStatusLabel> because duration is a distinct,
// caller-computed concern (it needs the before/after timestamps, and whether to
// show a static duration vs a live elapsed counter).
//
// Renders "· {{ value }}" when a value is given, else a dimmed placeholder ("-").
// The caller passes the already-formatted string (e.g. dateUtils.durationBetween
// output) — this component only lays it out consistently.
defineProps({
  // Preformatted duration string (e.g. '1m 4s'), or null when none is available.
  value: {
    type: [String, null],
    default: null,
  },
  // Placeholder shown when `value` is null/empty. Empty by default → renders
  // nothing (e.g. the Upload step has no timestamps). Pass e.g. '—' if a caller
  // wants a visible dash.
  placeholder: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <span v-if="value || placeholder" class="text-muted tabular-nums text-xs">
    <template v-if="value">· {{ value }}</template>
    <template v-else>{{ placeholder }}</template>
  </span>
</template>
