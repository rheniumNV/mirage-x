import { useMemo, useSyncExternalStore } from "react";

import { createMirrorRef, isMirrorRef, type MirrorRef } from "./mirrorRef.js";

export const useMirrorRef = (): MirrorRef => {
  return useMemo(() => createMirrorRef(), []);
};

/** Subscribe to a MirrorRef and return a snapshot string (unitId + ref option). */
export const useMirrorRefSnapshot = (
  ref: MirrorRef | null | undefined,
): string => {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!ref) {
        return () => {};
      }
      return ref.subscribe(onStoreChange);
    },
    () => (ref ? ref.getSnapshot() : ""),
    () => (ref ? ref.getSnapshot() : ""),
  );
};

export { createMirrorRef, isMirrorRef };
export type { MirrorRef, MirrorRefOption, MirrorRefBindMeta } from "./mirrorRef.js";
