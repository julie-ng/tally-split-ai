import { useHouseholdStore } from '~/stores/household.store'

/**
 * Wraps a household member as a unified user object with derived fields
 * (firstName, profileUrl) on top of the raw record (id, displayName,
 * username, initials, avatarUrl, createdAt).
 *
 * Accepts a ref, computed, getter, or plain id — resolved via toValue.
 * Returns a single computed ref so the consumer can use `user.firstName`
 * etc. in templates without dealing with separate computeds per field.
 */
export function useHouseholdMember (idSource) {
  const householdStore = useHouseholdStore()

  return computed(() => {
    const id = toValue(idSource)
    if (!id) return null

    const member = householdStore.getMemberById(id)
    if (!member) return null

    return {
      ...member,
      firstName: householdStore.getMemberFirstName(id),
      profileUrl: householdStore.getUserProfileUrl(id),
    }
  })
}
