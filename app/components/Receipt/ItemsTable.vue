<script setup>
defineProps({
  items: Array, // validate before this
  hasQuantity: {
    type: Boolean,
    default: false,  // show column or not?
  },
  subtotal: {
    type: Number,
    required: false,
  },
})
</script>

<template>
  <div>
    <table class="my-3 text-sm">
      <thead>
        <tr>
          <th v-if="hasQuantity" class="p-2 border-b border-slate-300 font-medium">
            Qty.
          </th>
          <th class="p-2 border-b border-slate-300 font-medium text-left">
            Item
          </th>
          <th class="p-2 border-b border-slate-300 font-medium text-right">
            Price
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item, id in items" :key="id">
          <td v-if="hasQuantity" class="p-2 border-b border-slate-200 text-center">
            <!-- Quantity: doesn't always exist -->
            <template v-if="item.quantity">
              {{ item.quantity.value }}
            </template>
          </td>
          <td class="p-2 border-b border-slate-200 text-left">
            {{ item.description.value }}
          </td>
          <td class="p-2 pl-10 border-b border-slate-200 text-right">
            <!-- Total Price: doesn't always exist -->
            <template v-if="item.totalPrice">
              {{ receiptUtils.formatCurrency(item.totalPrice.value) }}
            </template>
          </td>
        </tr>
        <tr v-if="subtotal">
          <td v-if="hasQuantity" />
          <td :colspan="hasQuantity ? 1 : 2" class="p-2 pr-4 text-right">
            Subtotal
          </td>
          <td class="p-2 text-right">
            {{ receiptUtils.formatCurrency(subtotal) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
