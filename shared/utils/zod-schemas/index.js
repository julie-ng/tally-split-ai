import { addressSchema } from './address.schema.js'
import { analysisSummarySchema } from './analysis-summary.schema.js'
import { currencySchema } from './currency.schema.js'
import { itemSchema } from './item.schema.js'
import { uploadObject } from './upload-object.schema.js'

export const zodSchemas = {
  addressSchema,
  analysisSummarySchema,
  currencySchema,
  itemSchema,
  uploadObject
}
