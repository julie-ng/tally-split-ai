import { addMemberRequestSchema } from './add-member.schema.js'
import { addressSchema } from './address.schema.js'
import { analysisSummarySchema } from './analysis-summary.schema.js'
import { currencySchema } from './currency.schema.js'
import { householdUpdateSchema } from './household.schema.js'
import { itemSchema } from './item.schema.js'
import { newBlobRequestSchema } from './blob.schema.js'
import { idParamSchema } from './params.schema.js'
import { receiptSchema, receiptInputSchema } from './receipt.schema.js'
import { splitSchema, splitRequestSchema, splitUpdateSchema, splitTaskResolutionSchema } from './split.schema.js'
import { tokenReadRequestSchema } from './token-read-request.schema.js'
import { uploadObject } from './upload-object.schema.js'
import { uploadUpdateSchema } from './upload-update.schema.js'
import { userUpdateSchema } from './user.schema.js'
import { workflowRunSchema, workflowRunInsertSchema } from './workflow-run.schema.js'

export const zodSchemas = {
  addMemberRequestSchema,
  addressSchema,
  analysisSummarySchema,
  currencySchema,
  householdUpdateSchema,
  idParamSchema,
  itemSchema,
  newBlobRequestSchema,
  receiptSchema,
  receiptInputSchema,
  splitSchema,
  splitRequestSchema,
  splitUpdateSchema,
  splitTaskResolutionSchema,
  tokenReadRequestSchema,
  uploadObject,
  uploadUpdateSchema,
  userUpdateSchema,
  workflowRunSchema,
  workflowRunInsertSchema,
}
