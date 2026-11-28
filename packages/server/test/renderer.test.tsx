import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { useEffect, useState, type ReactElement } from "react";

import { Logger } from "../src/index.js";
import { DummyReactRenderer } from "../src/server/dummyReactRenderer.js";
import { LogicManager } from "../src/server/logicManager.js";

// MirageX relies on synchronous rendering (as with React 18's legacy root),
// which React 19 no longer does by default. These check the order directly,
// so they do not depend on timing.
describe("DummyReactRenderer is synchronous", () => {
  it("render() returns after the first render and its effects", () => {
    const log: string[] = [];
    const Probe = () => {
      log.push("render");
      useEffect(() => {
        log.push("effect");
      });
      return null;
    };
    DummyReactRenderer.render(<Probe />);
    log.push("after render()");
    assert.deepEqual(log, ["render", "effect", "after render()"]);
  });

  it("flushSync() returns after the updates made in it are rendered", () => {
    const log: string[] = [];
    let set: (n: number) => void = () => {};
    const Probe = () => {
      const [n, setN] = useState(0);
      set = setN;
      log.push(`render ${n}`);
      useEffect(() => {
        log.push(`effect ${n}`);
      });
      return null;
    };
    DummyReactRenderer.render(<Probe />);
    DummyReactRenderer.flushSync(() => set(1));
    log.push("after flushSync()");
    assert.deepEqual(log, [
      "render 0",
      "effect 0",
      "render 1",
      "effect 1",
      "after flushSync()",
    ]);
  });

  it("an update outside flushSync() is rendered before the next task", async () => {
    const log: string[] = [];
    let set: (n: number) => void = () => {};
    const Probe = () => {
      const [n, setN] = useState(0);
      set = setN;
      useEffect(() => {
        log.push(`effect ${n}`);
      });
      return null;
    };
    DummyReactRenderer.render(<Probe />);
    set(1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(log, ["effect 0", "effect 1"]);
  });
});

describe("LogicManager", () => {
  const create = (app: () => ReactElement) =>
    new LogicManager(app, new Logger({ contextName: "test", logLevel: "error" }), {
      connectionId: "connection",
      ownerId: "U-test",
      lang: "ja",
      authUrl: "http://127.0.0.1:9/",
      platformApiUrl: "http://127.0.0.1:9/",
    });

  it("close() straight after construction unmounts the app", () => {
    const log: string[] = [];
    const App = () => {
      useEffect(() => {
        log.push("mount");
        return () => {
          log.push("unmount");
        };
      }, []);
      return <></>;
    };
    const originalInfo = console.info;
    console.info = () => {};
    try {
      const manager = create(App);
      assert.deepEqual(log, ["mount"]);
      manager.close();
      assert.deepEqual(log, ["mount", "unmount"]);
    } finally {
      console.info = originalInfo;
    }
  });
});
