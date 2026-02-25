<script setup>
const props = defineProps({
  blobName: {
    type: String,
    required: true,
  },
  alt: {
    type: String,
    required: false,
    default: '',
  },
  polygons: {
    type: Array,
    required: true,
  },
  // Original image dimensions in pixels, used to set the SVG viewBox so
  // polygon coordinates (which are in image pixel space) scale correctly
  // to match the rendered display size of the image.
  pageWidth: {
    type: Number,
    required: true,
  },
  pageHeight: {
    type: Number,
    required: true,
  },
})

const polygonToSvgPoints = (polygon) => {
  const points = []
  for (let i = 0; i < polygon.length; i += 2) {
    points.push(`${polygon[i]},${polygon[i + 1]}`)
  }
  return points.join(' ')
}
</script>

<template>
  <div class="relative">
    <blob-image
      :blob-name="props.blobName"
      :alt="props.alt"
    />
    <svg
      class="absolute inset-0 w-full h-full pointer-events-none"
      :viewBox="`0 0 ${props.pageWidth} ${props.pageHeight}`"
      preserveAspectRatio="none"
    >
      <polygon
        v-for="region in props.polygons"
        :key="region.label"
        :points="polygonToSvgPoints(region.polygon)"
        fill="rgba(59, 130, 246, 0.15)"
        stroke="rgba(59, 130, 246, 0.6)"
        stroke-width="2"
      />
    </svg>
  </div>
</template>
