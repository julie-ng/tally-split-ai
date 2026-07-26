<script setup>
// Shared inline status render: [optional dot] label [· optional duration].
// Pure presentational leaf — the caller decides the label/colors/duration; this
// only lays them out consistently. Used by:
//   • UploadStatusCell (table)              — completed = green dot + label + duration
//   • UploadWorkflowTimelineStep (timeline) — per-step dot/label + duration/elapsed
//
// The status→label/color CONFIG stays in each caller (run-level vs per-step maps
// differ); only this markup is shared.
defineProps({
  label: {
    type: String,
    required: true,
  },
  // Tailwind bg-* class for the leading dot (e.g. 'bg-success'). Omit → no dot.
  dotColor: {
    type: String,
    default: null,
  },
  // Text class for the label (e.g. 'text-default', 'text-primary'). The caller's
  // per-status color.
  labelClass: {
    type: String,
    default: 'text-default',
  },
  // Preformatted duration string (e.g. '1m 4s'); already prefixed with '· ' here
  // when shown. Omit → nothing after the label.
  duration: {
    type: [String, null],
    default: null,
  },
})
</script>

<template>
  <span class="inline-flex items-center gap-1.5 text-xs">
    <span
      v-if="dotColor"
      class="size-2 rounded-full"
      :class="dotColor"
    />
    <span class="font-medium" :class="labelClass">{{ label }}</span>
    <span v-if="duration" class="text-muted tabular-nums">· {{ duration }}</span>
  </span>
</template>
