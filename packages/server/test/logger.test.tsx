import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LoggerProvider } from "../src/logger/context.js";
import { DummyReactRenderer } from "../src/server/dummyReactRenderer.js";
import { render } from "../src/server/render.js";
import { LogContext, Logger, useLogger } from "../src/index.js";

describe("useLogger / LogContext", () => {
  it("gives a component the logger MirageX provides, and a child logger under LogContext", () => {
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
    const app = seen.find((s) => s.where === "app")?.logger;
    const child = seen.find((s) => s.where === "child")?.logger;
    assert.equal(app, root);
    assert.ok(child instanceof Logger);
    assert.notEqual(child, root);
  });

  it("an app rendered by MirageXServer's render() gets the logger it was given", () => {
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
    assert.ok(seen.length > 0, "App was not rendered");
    assert.ok(seen.every((l) => l === logger));
  });

  it("throws outside MirageX's logger", () => {
    const Probe = () => {
      useLogger();
      return null;
    };
    const errors: unknown[] = [];
    const original = console.error;
    console.error = (error: unknown) => errors.push(error);
    try {
      DummyReactRenderer.render(<Probe />);
    } finally {
      console.error = original;
    }
    assert.ok(
      errors.some((e) => e instanceof Error && e.message === "Logger is not provided"),
    );
  });
});
