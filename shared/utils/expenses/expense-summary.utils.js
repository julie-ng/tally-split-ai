/**
 * Compute monthly summary numbers from a list of split rows.
 * Pure function — no DB, no I/O. Inputs are plain split objects.
 *
 * @param {Array<Object>} splits — split rows with userOneShare, userTwoShare,
 *   userOneId, userTwoId, paidByUserId.
 * @returns {{
 *   userOneShare: number,
 *   userTwoShare: number,
 *   userOnePaidForUserTwo: number,
 *   userTwoPaidForUserOne: number,
 *   netBalance: number,
 *   unsettledCount: number,
 *   pendingCount: number,
 *   unattributedCount: number,
 *   unattributedAmount: number,
 * }}
 *
 * netBalance sign convention:
 *   > 0 → userTwo owes userOne
 *   < 0 → userOne owes userTwo
 *   = 0 → even (or all unattributed)
 */
export function summarizeExpenses (splits) {
  let userOneShare = 0
  let userTwoShare = 0
  let userOnePaidForUserTwo = 0
  let userTwoPaidForUserOne = 0
  let pendingCount = 0
  let unattributedCount = 0
  let unattributedAmount = 0

  for (const split of splits) {
    if (split.userOneShare === null || split.userTwoShare === null) {
      pendingCount++
      continue
    }

    userOneShare += split.userOneShare
    userTwoShare += split.userTwoShare

    if (split.paidByUserId === split.userOneId) {
      userOnePaidForUserTwo += split.userTwoShare
    }
    else if (split.paidByUserId === split.userTwoId) {
      userTwoPaidForUserOne += split.userOneShare
    }
    else {
      unattributedCount++
      unattributedAmount += split.userOneShare + split.userTwoShare
    }
  }

  const round = n => Math.round(n * 100) / 100

  return {
    userOneShare: round(userOneShare),
    userTwoShare: round(userTwoShare),
    userOnePaidForUserTwo: round(userOnePaidForUserTwo),
    userTwoPaidForUserOne: round(userTwoPaidForUserOne),
    netBalance: round(userOnePaidForUserTwo - userTwoPaidForUserOne),
    unsettledCount: splits.length,
    pendingCount,
    unattributedCount,
    unattributedAmount: round(unattributedAmount),
  }
}
