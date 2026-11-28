import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  Suspense,
  use,
  useEffect,
  useState,
  type ReactElement,
} from "react";

import { Logger } from "../src/index.js";
import { DummyReactRenderer } from "../src/server/dummyReactRenderer.js";
import { LogicManager } from "../src/server/logicManager.js";

// MirageX relies on synchronous rendering, effects included, which React 19
// no longer does by default. These check the order directly, so they do not
// depend on timing.
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

  it("an update outside flushSync() is rendered in a microtask", async () => {
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
    log.push("after setState");
    // React queued its microtask in set(1), before this one.
    await Promise.resolve();
    assert.deepEqual(log, ["effect 0", "after setState", "effect 1"]);
  });

  it("an update made in an effect is rendered before render() returns", () => {
    const log: string[] = [];
    const Probe = () => {
      const [n, setN] = useState(0);
      log.push(`render ${n}`);
      useEffect(() => {
        if (n === 0) setN(1);
      }, [n]);
      return null;
    };
    DummyReactRenderer.render(<Probe />);
    log.push("after render()");
    assert.deepEqual(log, ["render 0", "render 1", "after render()"]);
  });
});

describe("DummyReactRenderer limits", () => {
  it("stops an effect that keeps setting state, and unmounts the app", () => {
    const log: string[] = [];
    const Looping = () => {
      const [n, setN] = useState(0);
      useEffect(() => {
        setN(n + 1);
      }, [n]);
      return null;
    };
    const App = () => {
      useEffect(() => {
        log.push("mount");
        return () => {
          log.push("unmount");
        };
      }, []);
      return <Looping />;
    };
    const errors: unknown[] = [];
    const original = console.error;
    console.error = (error: unknown) => errors.push(error);
    try {
      DummyReactRenderer.render(<App />);
    } finally {
      console.error = original;
    }
    assert.deepEqual(log, ["mount", "unmount"]);
    assert.ok(errors.length > 0);
  });

  it("shows a Suspense boundary's content once its data is ready", async () => {
    const log: string[] = [];
    let resolve: (value: string) => void = () => {};
    const data = new Promise<string>((r) => {
      resolve = r;
    });
    const Content = () => {
      const value = use(data);
      useEffect(() => {
        log.push(value);
      }, [value]);
      return null;
    };
    const Fallback = () => {
      useEffect(() => {
        log.push("fallback");
      }, []);
      return null;
    };
    DummyReactRenderer.render(
      <Suspense fallback={<Fallback />}>
        <Content />
      </Suspense>,
    );
    // Ready well within React's 300 ms throttle after the fallback.
    setTimeout(() => resolve("content"), 10);
    for (let i = 0; i < 200 && !log.includes("content"); i++) {
      await new Promise((r) => setTimeout(r, 5));
    }
    assert.deepEqual(log, ["fallback", "content"]);
  });
});

describe("LogicManager", () => {
  const logger = new Logger({ contextName: "test", logLevel: "error" });
  const create = (app: () => ReactElement) =>
    new LogicManager(app, logger, {
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
