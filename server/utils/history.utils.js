import { trackChanges } from './change-history/track-changes.js'
import { trackCreate } from './change-history/track-create.js'
import { trackBatchChanges } from './change-history/track-batch-changes.js'

export const historyUtils = {
  trackChanges,
  trackCreate,
  trackBatchChanges,
}
