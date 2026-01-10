import { addressSchema } from './address.schema.js'
import { analysisSummarySchema } from './analysis-summary.schema.js'
import { currencySchema } from './currency.schema.js'
import { itemSchema } from './item.schema.js'
import { newBlobRequestSchema } from './blob.schema.js'
import { hashIdParamSchema, idParamSchema } from './params.schema.js'
import { receiptSchema, receiptInputSchema } from './receipt.schema.js'
import { uploadObject } from './upload-object.schema.js'
import { uploadUpdateSchema } from './upload-update.schema.js'

export const zodSchemas = {
  addressSchema,
  analysisSummarySchema,
  currencySchema,
  hashIdParamSchema,
  idParamSchema,
  itemSchema,
  newBlobRequestSchema,
  receiptSchema,
  receiptInputSchema,
  uploadObject,
  uploadUpdateSchema
}
