import { setSettled } from './expenses/set-settled.js'
import { setNeedsReview } from './expenses/set-needs-review.js'
import { deleteManyExpenses } from './expenses/delete-many.js'

export const expensesUtils = {
  setSettled,
  setNeedsReview,
  deleteMany: deleteManyExpenses,
}
