import { checkTaskUploadScope } from './authz-permissions/check-task-upload-scope.js'
import { checkTaskReceiptScope } from './authz-permissions/check-task-receipt-scope.js'
import { checkTaskSplitScope } from './authz-permissions/check-task-split-scope.js'

export const authzPermissions = {
  checkTaskUploadScope,
  checkTaskReceiptScope,
  checkTaskSplitScope,
}
