import {
  useState,
  type Dispatch,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
} from "react";

import type { UnitChangeServerEvent } from "../src/common/unitChangeEvent.js";
import { MainRootContextProvider } from "../src/main/index.js";
import { DummyReactRenderer } from "../src/server/dummyReactRenderer.js";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Wait until React has flushed effects and the re-renders they trigger:
 * no new events for several consecutive macrotask turns (at most ~2s).
 */
export const flush = async (events: unknown[] = []) => {
  let stableTurns = 0;
  let last = events.length;
  for (let turn = 0; turn < 400 && stableTurns < 5; turn++) {
    await tick();
    stableTurns = events.length === last ? stableTurns + 1 : 0;
    last = events.length;
  }
};

const mounted: Array<() => Promise<void>> = [];

/** Unmount everything mounted by `mount` (call from `afterEach`). */
export const unmountAll = async () => {
  for (const unmount of mounted.splice(0)) await unmount();
};

/** Render `element` under a MainRoot that records every emitted event. */
export const mount = async (element: ReactElement) => {
  const events: UnitChangeServerEvent[] = [];
  const functionMap = new Map<string, (...args: unknown[]) => unknown>();
  const gate = createControl(true);
  DummyReactRenderer.render(
    <MainRootContextProvider
      value={{
        connectionId: "connection",
        ownerId: "U-test",
        lang: "ja",
        eventEmitter: (event) => events.push(event),
        functionMap,
      }}
    >
      <gate.Control>{(show) => (show ? element : null)}</gate.Control>
    </MainRootContextProvider>,
  );
  const settle = () => flush(events);
  await settle();
  const unmount = async () => {
    await gate.set(false);
    await settle();
  };
  mounted.push(unmount);
  return {
    events,
    functionMap,
    unmount,
    /** Wait until no more events arrive (call after changing a control). */
    settle,
    /** Returns a getter for the events emitted after this call. */
    since: () => {
      const start = events.length;
      return () => events.slice(start);
    },
  };
};

/**
 * A piece of state that a test can change from outside the tree.
 * After `set`, call the mount's `settle()` to wait for the resulting events.
 */
export const createControl = <S,>(initial: S) => {
  let setState: Dispatch<SetStateAction<S>> | undefined;
  const Control = ({ children }: { children: (state: S) => ReactNode }) => {
    // Wrapped so that function-valued state is stored, not called.
    const [state, set] = useState(() => initial);
    setState = set;
    return <>{children(state)}</>;
  };
  return {
    Control,
    set: async (state: S) => {
      if (!setState) throw new Error("Control is not mounted");
      setState(() => state);
      await tick();
    },
  };
};

export const generated = (events: UnitChangeServerEvent[], code: string) => {
  const event = events.find(
    (e) => e.type === "generateUnit" && e.unit.code === code,
  );
  if (!event || event.type !== "generateUnit") {
    throw new Error(`generateUnit for ${code} not found`);
  }
  return event.unit;
};

export const propUpdates = (events: UnitChangeServerEvent[], unitId: string) =>
  events.flatMap((e) =>
    e.type === "updateProp" && e.unit.id === unitId ? [e.unit.prop] : [],
  );
