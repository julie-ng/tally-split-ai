import { EventEmitter } from 'node:events'

/**
 * Server-side event bus for workflow status updates.
 * Channel key is userId (never leaves the server).
 * Singleton — shared across all API handlers in the same Node process.
 */
export const workflowBus = new EventEmitter()
