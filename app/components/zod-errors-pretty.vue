<script setup>
const props = defineProps({
  title: {
    type: String,
    required: false,
  },
  message: {
    type: String,
    required: false,
  },
  errors: {
    type: Object,
    required: false,
    default: () => ({ formErrors: [], fieldErrors: {} }),
  },
  // should have `formErrors` Array and `fieldErrors` Object
  // formErrors: {
  //   type: Array,
  //   required: false,
  //   default: () => [],
  // },
  // fieldErrors: {
  //   type: Object,
  //   required: false,
  //   default: () => {},
  // },
})

const hasFormErrors = computed(() => props.errors?.formErrors?.length > 0)
const hasFieldErrors = computed(() => Object.keys(props.errors?.fieldErrors).length > 0)

// Example Error Object
// {
//   formErrors: [ 'Unrecognized key: "extraKey"' ],
//   fieldErrors: {
//     username: [ 'Invalid input: expected string, received number' ],
//     favoriteNumbers: [ 'Invalid input: expected number, received string' ]
//   }
// }
</script>

<template>
  <div class="my-4 p-4 border border-rose-200 rounded-sm bg-rose-50 text-rose-700 text-sm">
    <div class="flex flex-row ">
      <div class="pr-2">
        <UIcon name="i-lucide-triangle-alert" class="size-5" />
      </div>
      <div class="flex-1">
        <h1 v-if="props.title" class="font-bold mb-1">
          {{ props.title }}
        </h1>
        <div v-if="props.message" class="mb-2">
          {{ props.message }}
        </div>
        <ul v-if="hasFormErrors" class="list-disc">
          <li v-for="(err, i) in props.errors.formErrors" :key="`form-error-${i}`" class="ml-4">
            {{ err }}
          </li>
        </ul>
        <ul v-if="hasFieldErrors" class="list-disc">
          <li v-for="(val, key) in props.errors.fieldErrors" :key="`field-error-${key}`" class="ml-4 mb-1">
            <code>{{ key }}</code>
            <ul class="list-circle">
              <li v-for="(v, j) in val" :key="`field-error-key-${j}`" class="ml-8">
                {{ v }}
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.list-circle {
  list-style-type: circle;
}
/**
.warning {
  // background-color: var(--ui-color-warning-50);
  border-color: var(--ui-color-warning-200);
}
*/
</style>
