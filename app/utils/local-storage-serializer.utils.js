/**
 * Custom serializer for useLocalStorage that strips File objects.
 * File objects cannot be serialized to JSON, so they are removed on write
 * and set to null on read (files can't be restored after page refresh).
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
    const serializable = v.map((item) => {
      /* eslint-disable-next-line no-unused-vars */
      const { file, ...rest } = item
      return rest
    })
    return JSON.stringify(serializable)
  },
}
