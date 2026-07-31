// `changes.source` is an opaque string written by whoever made the change:
// 'user:<userId>' for a human, 'task:<taskName>' for a pipeline step. This turns
// it into what a timeline row needs to render an attribution.
//
// Takes the household store rather than calling useHouseholdStore() itself so it
// stays a pure function — callers already hold the store, and a util that reaches
// for a Pinia store is only usable inside a component setup.

/**
 * @param {string|null} source - 'user:<userId>' | 'task:<name>' | anything else
 * @param {object} householdStore - useHouseholdStore() instance
 * @returns {{ isBot: boolean, label: string, avatar: string|null }}
 */
export function describeChangeSource (source, householdStore) {
  if (source?.startsWith('user:')) {
    const userId = source.slice(5)
    return {
      isBot: false,
      label: householdStore.getMemberName(userId),
      avatar: householdStore.getMemberAvatarUrl(userId),
    }
  }
  // task:<name> — and anything unrecognised — reads as a bot rather than
  // silently rendering as a person with a blank avatar.
  return { isBot: true, label: source, avatar: null }
}
