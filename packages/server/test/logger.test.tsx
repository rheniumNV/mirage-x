import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LoggerProvider } from "../src/logger/context.js";
import { DummyReactRenderer } from "../src/server/dummyReactRenderer.js";
import { render } from "../src/server/render.js";
import { LogContext, Logger, useLogger } from "../src/index.js";

/**
 * Wait until `done()`: React may run the render later than the call. Throws
 * `message` after `timeoutMs`.
 */
const until = async (
  done: () => boolean,
  message: string,
  timeoutMs = 2000,
) => {
  const start = Date.now();
  while (!done()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`timed out: ${message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

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
    await until(() => seen.length >= 2, "both probes rendered with a logger");
    const app = seen.find((s) => s.where === "app")?.logger;
    const child = seen.find((s) => s.where === "child")?.logger;
    assert.equal(app, root);
    assert.ok(child instanceof Logger);
    assert.notEqual(child, root);
  });

  it("an app rendered by MirageXServer's render() gets the logger it was given", async () => {
    const logger = new Logger({ contextName: "server", logLevel: "error" });
    const seen: Logger[] = [];
    const App = () => {
      seen.push(useLogger());
      return <></>;
    };
    const AppRenderer = render(App, logger);
    DummyReactRenderer.render(
      <AppRenderer
        connectionId="connection"
        ownerId="U-test"
        lang="ja"
        eventEmitter={() => {}}
        functionMap={new Map()}
        propsSetterRegister={() => {}}
        platformApiUrl="http://127.0.0.1:9/"
      />,
    );
    await until(() => seen.length > 0, "App rendered with a logger");
    assert.ok(seen.every((l) => l === logger));
  });

  it("throws outside MirageX's logger", async () => {
    // Caught inside the component, so the test does not depend on how the
    // renderer reports render errors.
    const caught: unknown[] = [];
    const Probe = () => {
      try {
        useLogger();
      } catch (error) {
        caught.push(error);
      }
      return null;
    };
    DummyReactRenderer.render(<Probe />);
    await until(() => caught.length > 0, "useLogger threw outside a provider");
    assert.ok(
      caught.every(
        (e) => e instanceof Error && e.message === "Logger is not provided",
      ),
    );
  });
});
