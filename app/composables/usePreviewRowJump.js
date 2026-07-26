/**
 * Auto-jump a paginated UTable to the page containing a previewed row, so a
 * deep-linked (`?preview=<id>`) row's highlight is actually visible.
 *
 * Uses TanStack's SORTED/filtered row model — not raw data order — so the page
 * math respects the active sort + filters. (Getting this wrong lands the jump on
 * the wrong page, so clicking/highlighting hits the wrong row.)
 *
 * Shared by the expenses + uploads tables, which had identical copies. Each
 * table passes its own reactive getters; the watch fires on any of them
 * changing (and once immediately for cold-load deep-links).
 *
 * @param {Object} sources - reactive getters (call them, don't pass .value)
 * @param {() => (string|null)} sources.previewId - the currently previewed row id
 * @param {() => Array} sources.data - the table's row data
 * @param {() => Array} sources.sorting - the active sorting state
 * @param {() => (Object|undefined)} sources.tableApi - the UTable tableApi
 */
export function usePreviewRowJump ({ previewId, data, sorting, tableApi }) {
  watch(
    [previewId, data, sorting, tableApi],
    ([id, _rows, _sorting, api]) => {
      if (!id || !api) {
        return
      }
      const sortedRows = api.getSortedRowModel().rows
      const index = sortedRows.findIndex(r => r.original.id === id)
      if (index < 0) {
        return
      }
      const size = api.getState().pagination.pageSize
      api.setPageIndex(Math.floor(index / size))
    },
    { immediate: true },
  )
}
