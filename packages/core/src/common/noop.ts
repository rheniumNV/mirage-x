/**
 * Stable no-op for placeholder event handlers.
 * Inline `() => {}` creates a new reference each render and breaks MirageX
 * handler-id sync to Resonite.
 */
export const noop = (..._args: unknown[]): void => {};
