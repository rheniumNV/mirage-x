import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { describe, it } from "node:test";
import {
  Activity,
  useEffect,
  useState,
  type ReactElement,
} from "react";
import type { WebSocket } from "ws";

import { UnitProp, generateUnitConfig } from "@mirage-x/core";
import { Logger, generateMain } from "../src/index.js";
import { Connection } from "../src/server/connection.js";
import { DummyReactRenderer } from "../src/server/dummyReactRenderer.js";

const Host = generateMain(
  generateUnitConfig({
    code: "Test/Host",
    propsConfig: { size: UnitProp.Float(1) },
    children: "multi",
  }),
);
const Leaf = generateMain(
  generateUnitConfig({
    code: "Test/Leaf",
    propsConfig: { label: UnitProp.String("x") },
  }),
);
const App = () => (
  <Host>
    <Leaf />
  </Host>
);

class FakeWs extends EventEmitter {
  sent: string[] = [];
  send(message: unknown) {
    this.sent.push(String(message));
  }
  close() {
    this.emit("close");
  }
}

/** The sync events' types and unit codes, in order. */
const summary = (messages: unknown[]) =>
  messages.map((m) => {
    const text = typeof m === "string" ? m : JSON.stringify(m);
    const type = text.match(
      /generateUnit|initUnitPropOrigin|updateProp|destroyUnit/,
    )?.[0];
    return `${type} ${text.match(/Test\/\w+/)?.[0]}`;
  });

// Sent while the app renders.
const first = [
  "initUnitPropOrigin Test/Leaf",
  "initUnitPropOrigin Test/Host",
  "generateUnit Test/Host",
];
// Effects run child first, so the leaf waits (a few ms) for its parent.
const all = [...first, "generateUnit Test/Leaf"];

const until = async (done: () => boolean) => {
  for (let i = 0; i < 200 && !done(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

/** Count the manager's unitMap lookups (each retry looks the unit up). */
const countLookups = (unitMap: Map<string, unknown>) => {
  let count = 0;
  const has = unitMap.has.bind(unitMap);
  const get = unitMap.get.bind(unitMap);
  unitMap.has = (key) => (count++, has(key));
  unitMap.get = (key) => (count++, get(key));
  return () => count;
};

// The app's first render and its effects run while the connection handles
// `init`, so its first sync events must already have somewhere to go.
describe("Connection", () => {
  const open = (
    app: () => ReactElement,
    eventCountSolver?: (count: number) => number,
  ) => {
    const ws = new FakeWs();
    const connection = new Connection({
      ws: ws as unknown as WebSocket,
      logger: new Logger({ contextName: "test", logLevel: "error" }),
      onClose: () => {},
      ownerIp: "",
      version: "1",
      serverId: "server",
      authUrl: "http://127.0.0.1:9/",
      app,
      platformApiUrl: "http://127.0.0.1:9/",
      eventCountSolver,
    });
    const init = { version: "1", ownerId: "U-test", lang: "ja" };
    ws.emit(
      "message",
      Buffer.from(JSON.stringify({ type: "init", data: init })),
    );
    // The first two messages are `version` and `initialData`.
    const synced = () => summary(ws.sent.slice(2));
    return { ws, connection, synced };
  };

  /** Run `fn` with a quiet console; close the connection even if it throws. */
  const withConnection = async (
    connect: () => ReturnType<typeof open>,
    fn: (opened: ReturnType<typeof open>) => Promise<void>,
  ) => {
    const { info, debug, log } = console;
    console.info = console.debug = console.log = () => {};
    let opened: ReturnType<typeof open> | undefined;
    try {
      opened = connect();
      await fn(opened);
    } finally {
      opened?.ws.close();
      Object.assign(console, { info, debug, log });
    }
  };

  it("sends the first render's sync events", () =>
    withConnection(
      () => open(App),
      async ({ synced }) => {
        assert.deepEqual(synced(), first);
        await until(() => synced().length >= all.length);
        assert.deepEqual(synced(), all);
      },
    ));

  it("sends the first render's sync events with eventCountSolver", () =>
    withConnection(
      () => open(App, (count) => count),
      async ({ connection, synced }) => {
        // Queued while the app renders, then sent every 10 ms.
        assert.deepEqual(summary(connection.events), first);
        await until(() => synced().length >= all.length);
        assert.deepEqual(synced(), all);
      },
    ));

  it("stops waiting for a parent once closed", () =>
    withConnection(
      () => open(App),
      async ({ ws, connection }) => {
        const unitMap = connection.logicManager?.unitMap;
        assert.ok(unitMap);
        // Close while the leaf still waits for its parent.
        ws.close();
        const lookups = countLookups(unitMap);
        await new Promise((resolve) => setTimeout(resolve, 20));
        assert.equal(lookups(), 0, "still retrying after close");
      },
    ));

  it("drops a unit removed while it waits for its parent", () => {
    // The leaf is removed by an effect, in the same `render()` call, while its
    // generateUnit waits for the host.
    const Removing = () => {
      const [show, setShow] = useState(true);
      useEffect(() => setShow(false), []);
      return <Host>{show && <Leaf />}</Host>;
    };
    return withConnection(
      () => open(Removing),
      async ({ connection, synced }) => {
        const unitMap = connection.logicManager?.unitMap;
        assert.ok(unitMap);
        // Let the pending retry run once and find the unit gone.
        await new Promise((resolve) => setTimeout(resolve, 10));
        const lookups = countLookups(unitMap);
        await new Promise((resolve) => setTimeout(resolve, 20));
        assert.equal(lookups(), 0, "still retrying a removed unit");
        assert.deepEqual(synced(), [
          "initUnitPropOrigin Test/Leaf",
          "initUnitPropOrigin Test/Host",
          "generateUnit Test/Host",
        ]);
      },
    );
  });

  it("sends a unit shown again with the same id only once", () => {
    // Hidden and shown again (same id) while its generateUnit still waits.
    let setMode: (mode: "visible" | "hidden") => void = () => {};
    const Toggling = () => {
      const [mode, set] = useState<"visible" | "hidden">("visible");
      setMode = set;
      return (
        <Host>
          <Activity mode={mode}>
            <Leaf label="hello" />
          </Activity>
        </Host>
      );
    };
    return withConnection(
      () => open(Toggling),
      async ({ synced }) => {
        DummyReactRenderer.flushSync(() => setMode("hidden"));
        DummyReactRenderer.flushSync(() => setMode("visible"));
        await new Promise((resolve) => setTimeout(resolve, 20));
        const leaves = synced().filter((s) => s === "generateUnit Test/Leaf");
        assert.equal(leaves.length, 1);
      },
    );
  });
});
