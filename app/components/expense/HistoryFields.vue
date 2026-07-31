<script setup>
// The field-level rows of ONE change entry: column, old value, new value.
//
// Dumb leaf — renders the `fields` array it's handed and owns nothing. Lives in
// the History tab's timeline cards, one grid per entry.
//
// A CSS grid, NOT <UTable>. A table's layout algorithm sizes columns to their
// content, so a long value (a note, a restaurant title) widened its column and
// spilled over the next one — `table-fixed`, percentage widths and `max-w-0` all
// failed to contain it. `minmax(0, Xfr)` has no such algorithm: the 0 minimum is
// what lets a cell shrink below its content and wrap.
const props = defineProps({
  // [{ field, oldValue, newValue, confidence? }] — from /api/history/*.
  fields: {
    type: Array,
    default: () => [],
  },
})

// How each field's value should RENDER. History values arrive as raw strings —
// an id, an ISO timestamp, a number — so the field name is the only signal for
// what a value actually is. Anything unlisted renders as plain text.
const FIELD_KIND = {
  householdId: 'id',
  receiptId: 'id',
  expenseId: 'id',
  uploadId: 'id',
  userOneId: 'user',
  userTwoId: 'user',
  paidByUserId: 'user',
  date: 'date',
  time: 'text',
  splitAmount: 'number',
  userOneShare: 'number',
  userTwoShare: 'number',
  total: 'number',
  subtotal: 'number',
  tax: 'number',
}

// A null/undefined is a REAL value in change history ("this was cleared"), so
// it renders as the literal `null` rather than an em dash — an em dash would
// read as "no data here", which is the opposite meaning. The flag rides along
// so the cell can style the literal differently from actual content.
function displayValue (val, kind) {
  if (val === null || val === undefined) {
    return { text: 'null', isNull: true, kind: 'null' }
  }
  if (kind === 'date') {
    return { text: timestampUtils.toShortDatetime(val), isNull: false, kind }
  }
  return { text: val, isNull: false, kind }
}

const rows = computed(() => props.fields.map((f) => {
  const kind = FIELD_KIND[f.field] ?? 'text'
  return {
    field: f.field,
    oldValue: displayValue(f.oldValue, kind),
    newValue: displayValue(f.newValue, kind),
  }
}))

// 30 / 25 / 45. Old values are usually short (`null`, a number); the new value
// takes the most room, since that's the one worth reading.
//
// IMPORTANT
// - The `0` in each minmax() is load-bearing. A grid track's default minimum is
//   `auto` = "at least as wide as my content", which is exactly what stopped the
//   text wrapping. Removing it reintroduces the overflow.
const GRID = 'grid grid-cols-[minmax(0,30fr)_minmax(0,25fr)_minmax(0,45fr)] gap-x-3'
</script>

<template>
  <div class="text-sm overflow-hidden">
    <!-- Header -->
    <div :class="GRID" class="text-default text-xs py-2">
      <div>Column</div>
      <div>Before</div>
      <div>After</div>
    </div>

    <!-- Rows. break-words (not break-all) so prose and titles break at spaces;
         a value with no spaces at all still breaks, since it can't fit either
         way. -->
    <div
      v-for="row in rows"
      :key="row.field"
      :class="GRID"
      class="py-2 border-t border-default/60"
    >
      <div class="font-mono text-xs text-muted wrap-break-word">
        {{ row.field }}
      </div>

      <div class="wrap-break-word text-xs text-muted">
        <ExpenseHistoryValue :value="row.oldValue" />
      </div>

      <div class="wrap-break-word text-xs">
        <ExpenseHistoryValue :value="row.newValue" />
      </div>
    </div>
  </div>
</template>
