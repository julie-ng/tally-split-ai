/**
 * Custom serializer for useLocalStorage that strips File objects.
 *
 * File objects can't be JSON-serialized, so they're removed on write and read
 * back as null (the user has to re-attach files for queued items that survive
 * a refresh).
 *
 * Only `queued` and `interrupted` items are persisted. Persisting in-flight
 * (`in-progress`) items is unsafe: VueUse's `useLocalStorage` can re-read its
 * own writes back into the ref, and a null `file` mid-upload causes
 * `URL.createObjectURL(null)` to throw and the upload to fail. `completed`
 * items are also skipped — they self-evict from the queue, so re-hydrating
 * them would just bring back ghost rows.
 */
export const fileStripSerializer = {
  read: (v) => {
    try {
      const parsed = JSON.parse(v)
      return parsed.map(item => ({
        ...item,
        file: null,
      }))
    }
    catch {
      return []
    }
  },
  write: (v) => {
    const persistable = v.filter(item =>
      item.status === 'queued' || item.status === 'interrupted',
    )
    const serializable = persistable.map((item) => {
      /* eslint-disable-next-line no-unused-vars */
      const { file, ...rest } = item
      return rest
    })
    return JSON.stringify(serializable)
  },
}
