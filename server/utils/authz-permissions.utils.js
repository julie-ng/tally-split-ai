import { checkTaskUploadScope } from './authz-permissions/check-task-upload-scope.js'
import { checkTaskReceiptScope } from './authz-permissions/check-task-receipt-scope.js'
import { checkTaskExpenseScope } from './authz-permissions/check-task-expense-scope.js'

export const authzPermissions = {
  checkTaskUploadScope,
  checkTaskReceiptScope,
  checkTaskExpenseScope,
}
