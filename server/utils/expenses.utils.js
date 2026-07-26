import { setSettled } from './expenses/set-settled.js'
import { deleteManyExpenses } from './expenses/delete-many.js'

export const expensesUtils = {
  setSettled,
  deleteMany: deleteManyExpenses,
}
