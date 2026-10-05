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

/** Let React flush passive effects (and the re-renders they trigger). */
export const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

/** Render `element` under a MainRoot that records every emitted event. */
export const mount = async (element: ReactElement) => {
  const events: UnitChangeServerEvent[] = [];
  const functionMap = new Map<string, (...args: unknown[]) => unknown>();
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
      {element}
    </MainRootContextProvider>,
  );
  await flush();
  return {
    events,
    functionMap,
    /** Events emitted after this call. */
    since: () => {
      const start = events.length;
      return () => events.slice(start);
    },
  };
};

/** A piece of state that a test can change from outside the tree. */
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
      await flush();
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
