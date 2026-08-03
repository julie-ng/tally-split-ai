<script setup>
// Line items from Azure Document Intelligence, as a real <table> — the data is
// genuinely tabular and needs a shared column grid across rows.
//
// Cross-highlighting: hovering a cell publishes its Azure field label (e.g.
// `Items[2].Description`) to a `highlightedLabel` ref, which the polygon overlay
// on the receipt image reads to light up the matching box, and vice versa. The
// inject FALLS BACK to a local ref, so this table also renders standalone in
// surfaces that have no image overlay (e.g. the expense preview's Receipt tab).
defineProps({
  items: {
    type: Array,
    required: true,
  },
  hasQuantity: {
    type: Boolean,
    default: false,
  },
  subtotal: {
    type: Number,
    required: false,
    default: undefined,
  },
  tableClass: {
    type: String,
    default: 'my-3 text-sm',
  },
})

const highlightedLabel = inject('highlightedLabel', ref(null))

const itemLabel = (index, key) => `Items[${index}].${key}`

const isCellHighlighted = (index, key) =>
  highlightedLabel.value === itemLabel(index, key)

function highlight (index, key) {
  highlightedLabel.value = itemLabel(index, key)
}

function clearHighlight () {
  highlightedLabel.value = null
}
</script>

<template>
  <div>
    <table :class="tableClass">
      <thead>
        <tr>
          <th v-if="hasQuantity" class="py-2 border-b border-default font-medium">
            Qty.
          </th>
          <th class="py-2 border-b border-default font-medium text-left">
            Item
          </th>
          <th class="py-2 border-b border-default font-medium text-right">
            Price
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in items" :key="index">
          <td
            v-if="hasQuantity"
            class="pr-2 py-2 pl-0 border-b border-default text-center transition-colors duration-150 cursor-default"
          >
            <!-- Quantity: doesn't always exist -->
            <div
              v-if="item.quantity"
              :class="{ 'bg-primary/10': isCellHighlighted(index, 'Quantity') }"
              @mouseenter="highlight(index, 'Quantity')"
              @mouseleave="clearHighlight"
            >
              {{ item.quantity.value }}
            </div>
          </td>
          <td
            class="py-2 border-b border-default text-left transition-colors duration-150 cursor-default"
            :class="{ 'bg-primary/10': isCellHighlighted(index, 'Description') }"
            @mouseenter="highlight(index, 'Description')"
            @mouseleave="clearHighlight"
          >
            {{ item.description.value }}
          </td>
          <td class="py-2 pl-10 border-b border-default text-right transition-colors duration-150 cursor-default">
            <!-- Total Price: doesn't always exist -->
            <div
              v-if="item.totalPrice"
              :class="{ 'bg-primary/10': isCellHighlighted(index, 'TotalPrice') }"
              @mouseenter="highlight(index, 'TotalPrice')"
              @mouseleave="clearHighlight"
            >
              {{ receiptUtils.formatCurrency(item.totalPrice.value) }}
            </div>
          </td>
        </tr>
        <tr v-if="subtotal">
          <td v-if="hasQuantity" />
          <td class="py-2 pr-4 text-right">
            Subtotal
          </td>
          <td class="py-2 text-right">
            {{ receiptUtils.formatCurrency(subtotal) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
