import type { ShadowContext } from './types'

/** Production/opt-out replacement: no diagnostics, requests or catalog imports. */
export function useInventoryShadow(_context: ShadowContext, _active: boolean): void {
  void _context
  void _active
}
