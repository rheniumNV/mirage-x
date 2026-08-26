import http from "node:http";
import path from "node:path";

import { Logger } from "@mirage-x/core";
import { MirageXServer } from "@mirage-x/core/server";
import express from "express";
import { WebSocketServer } from "ws";

import { App } from "./app.js";
import { config } from "./config.js";

type RequestHandler = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => Promise<void> | void;

const insuring =
  (handler: RequestHandler): RequestHandler =>
  async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      next(err);
    }
  };

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

app.get(
  "/ping",
  insuring((_req, res) => {
    res.send("pong");
  }),
);

const mirageXConfig = {
  mirage: {
    url: config.mirage.url,
    port: config.mirage.port,
    serverId: config.mirage.serverId,
    apiPath: {
      info: "/info",
      output: "/output.brson",
      auth: "/auth/:connectionId",
      interactionEvent: "/events",
      websocket: "/ws",
    },
  },
  main: {
    appCode: config.appCode,
    outputPath: config.outputBrsonPath,
    versionPath: config.versionPath,
  },
  auth: {
    url: config.auth.url,
  },
  platform: {
    api: { url: config.platform.api.url },
  },
};

const rootLogger = new Logger({ contextName: "example-basic", logLevel: "info" });
const mirageX = new MirageXServer(App, rootLogger, mirageXConfig);
mirageX.route(app, wss);

if (process.env.NODE_ENV !== "production") {
  setInterval(() => {
    mirageX.reloadVersion();
  }, 1000);
}

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).send("error");
  },
);

app.use((req, res, _next) => {
  console.warn(`routing not found. method=${req.method} url=${req.path}`);
  res.status(404).send("NotFound");
});

server.listen(Number(config.mirage.port), () => {
  console.info(
    `Server is listening on port ${mirageXConfig.mirage.port} (artifact: ${path.basename(config.outputBrsonPath)})`,
  );
});
