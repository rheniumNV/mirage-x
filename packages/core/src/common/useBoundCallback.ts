import { useCallback } from "react";

/**
 * Stable callback that invokes `fn` with bound `args`.
 * Prefer this over ad-hoc `useCallback(() => fn(x), [fn, x])` for list item
 * handlers so MirageX handler-id sync stays stable.
 */
export function useBoundCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  ...args: A
): () => void {
  return useCallback(() => fn(...args), [fn, ...args]);
}
