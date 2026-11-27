import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LoggerProvider } from "../src/logger/context.js";
import { DummyReactRenderer } from "../src/server/dummyReactRenderer.js";
import { LogContext, Logger, useLogger } from "../src/index.js";

/** Let the renderer finish its work. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 10));

describe("useLogger / LogContext", () => {
  it("gives a component the logger MirageX provides, and a child logger under LogContext", async () => {
    const root = new Logger({ contextName: "root", logLevel: "error" });
    const seen: Array<{ where: string; logger: Logger }> = [];
    const Probe = ({ where }: { where: string }) => {
      seen.push({ where, logger: useLogger() });
      return null;
    };
    DummyReactRenderer.render(
      <LoggerProvider logger={root}>
        <Probe where="app" />
        <LogContext contextName="child">
          <Probe where="child" />
        </LogContext>
      </LoggerProvider>,
    );
    await tick();
    const app = seen.find((s) => s.where === "app")?.logger;
    const child = seen.find((s) => s.where === "child")?.logger;
    assert.equal(app, root);
    assert.ok(child instanceof Logger);
    assert.notEqual(child, root);
  });

  it("throws outside MirageX's logger", async () => {
    const Probe = () => {
      useLogger();
      return null;
    };
    const errors: unknown[] = [];
    const original = console.error;
    console.error = (error: unknown) => errors.push(error);
    try {
      DummyReactRenderer.render(<Probe />);
      await tick();
    } finally {
      console.error = original;
    }
    assert.ok(
      errors.some((e) => e instanceof Error && e.message === "Logger is not provided"),
    );
  });
});
