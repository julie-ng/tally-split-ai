import pino from 'pino'

const _logger = pino()
const _children = {}

/**
 * Returns a pino child logger with the given domain.
 * Must be called inside the handler (not at module top-level) because
 * Nitro bundles all server files into a single module, and auto-imported
 * bindings may not be initialized yet at top-level (temporal dead zone).
 */
export function useLogger (domain) {
  if (!_children[domain]) {
    _children[domain] = _logger.child({ domain })
  }
  return _children[domain]
}
