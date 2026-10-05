import type { RefType } from "./mainProp.js";

type Listener = () => void;

export type MirrorRefOption =
  | { refType: "RootSlot" }
  | { refType: "Slot"; refKey: string };

export type MirrorRefBindMeta = MirrorRefOption;

export type MirrorRef = {
  /** Bound producer unit id, or empty string when unbound. */
  getUnitId: () => string;
  /** How Resonite should resolve this ref (RootSlot vs named Slot). */
  getOption: () => MirrorRefOption;
  /** Stable string for React sync deps. */
  getSnapshot: () => string;
  subscribe: (listener: Listener) => () => void;
  /** Bind this handle to a producer unit + ref kind. */
  bind: (unitId: string, meta: MirrorRefBindMeta) => void;
  /** Clear bind if it currently points at `unitId`. */
  clearIf: (unitId: string) => void;
  /** Clear bind unconditionally. */
  clear: () => void;
};

const snapshotOf = (unitId: string, option: MirrorRefOption): string => {
  if (option.refType === "RootSlot") {
    return `${unitId}|RootSlot`;
  }
  return `${unitId}|Slot|${option.refKey}`;
};

export const createMirrorRef = (): MirrorRef => {
  let unitId = "";
  let option: MirrorRefOption = { refType: "RootSlot" };
  const listeners = new Set<Listener>();

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    getUnitId: () => unitId,
    getOption: () => option,
    getSnapshot: () => snapshotOf(unitId, option),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    bind: (nextUnitId, meta) => {
      const nextSnapshot = snapshotOf(nextUnitId, meta);
      if (snapshotOf(unitId, option) === nextSnapshot) {
        return;
      }
      unitId = nextUnitId;
      option = meta;
      notify();
    },
    clearIf: (expectedUnitId) => {
      if (unitId !== expectedUnitId) {
        return;
      }
      unitId = "";
      notify();
    },
    clear: () => {
      if (unitId === "") {
        return;
      }
      unitId = "";
      notify();
    },
  };
};

export const isMirrorRef = (value: unknown): value is MirrorRef => {
  return (
    typeof value === "object" &&
    value !== null &&
    "getUnitId" in value &&
    "getOption" in value &&
    "subscribe" in value &&
    "bind" in value
  );
};

export type { RefType };
