import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { describe, it } from "node:test";
import type { WebSocket } from "ws";

import { UnitProp, generateUnitConfig } from "@mirage-x/core";
import { Logger, generateMain } from "../src/index.js";
import { Connection } from "../src/server/connection.js";

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

// The app's first render and its effects run while the connection handles
// `init`, so its first sync events must already have somewhere to go.
describe("Connection", () => {
  const open = (eventCountSolver?: (count: number) => number) => {
    const ws = new FakeWs();
    const connection = new Connection({
      ws: ws as unknown as WebSocket,
      logger: new Logger({ contextName: "test", logLevel: "error" }),
      onClose: () => {},
      ownerIp: "",
      version: "1",
      serverId: "server",
      authUrl: "http://127.0.0.1:9/",
      app: App,
      platformApiUrl: "http://127.0.0.1:9/",
      eventCountSolver,
    });
    const init = { version: "1", ownerId: "U-test", lang: "ja" };
    ws.emit("message", Buffer.from(JSON.stringify({ type: "init", data: init })));
    return { ws, connection };
  };

  const quiet = async (fn: () => Promise<void>) => {
    const { info, debug, log } = console;
    console.info = console.debug = console.log = () => {};
    try {
      await fn();
    } finally {
      Object.assign(console, { info, debug, log });
    }
  };

  it("sends the first render's sync events", () =>
    quiet(async () => {
      const { ws } = open();
      // The first two messages are `version` and `initialData`.
      const synced = () => summary(ws.sent.slice(2));
      assert.deepEqual(synced(), first);
      await until(() => synced().length >= all.length);
      assert.deepEqual(synced(), all);
      ws.close();
    }));

  it("queues the first render's sync events with eventCountSolver", () =>
    quiet(async () => {
      const { ws, connection } = open((count) => count);
      // Taken from the queue every 10 ms, so look at what has been queued.
      const queued: unknown[] = [];
      const push = connection.events.push.bind(connection.events);
      assert.deepEqual(summary(connection.events), first);
      queued.push(...connection.events);
      connection.events.push = (...items) => {
        queued.push(...items);
        return push(...items);
      };
      await until(() => queued.length >= all.length);
      assert.deepEqual(summary(queued), all);
      ws.close();
    }));

  it("stops waiting for a parent once closed", () =>
    quiet(async () => {
      const { ws, connection } = open();
      ws.close();
      const sent = ws.sent.length;
      await new Promise((resolve) => setTimeout(resolve, 50));
      assert.equal(ws.sent.length, sent);
      assert.equal(connection.logicManager, undefined);
    }));
});
