import json2emap from "json2emap";
import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import type { ReactElement } from "react";
import type { Logger } from "../logger/index.js";
import type { UnitChangeClientEvent } from "../common/unitChangeEvent.js";
import { LogicManager } from "./logicManager.js";

type N2mEvent = {
  type: "init";
  data: {
    /**
     * Only "sync" is supported. Older clients send it explicitly; it may be
     * omitted. Any other value (e.g. the removed "tree" mode) is rejected.
     */
    eventType?: string;
    version: string;
    ownerId: string;
    lang: string;
  };
};

export class Connection {
  id: string;
  logger: Logger;
  ws: WebSocket;
  ownerIp: string;
  logicManager: LogicManager | undefined;
  version: string;
  serverId: string;
  authUrl: string;

  event_count = 0;
  events: UnitChangeClientEvent[] = [];
  eventSendInterval: ReturnType<typeof setInterval> | undefined;

  addEventCount = () => {
    this.event_count += 1;
  };

  constructor(init: {
    ws: WebSocket;
    logger: Logger;
    onClose: (connection: Connection) => void;
    ownerIp: string;
    version: string;
    serverId: string;
    authUrl: string;
    app: () => ReactElement;
    platformApiUrl: string;
    defaultAuthenticationToken?: string;
    eventCountSolver?: (eventCount: number) => number;
  }) {
    this.id = randomUUID();
    this.logger = init.logger.generateChildLogger({
      contextName: "connection",
      extraInfo: { connectionId: this.id },
    });
    this.ws = init.ws;
    this.ownerIp = init.ownerIp;
    this.version = init.version;
    this.serverId = init.serverId;
    this.authUrl = init.authUrl;

    this.ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString()) as N2mEvent;
        console.debug("received", data);
        const addEventCount = this.addEventCount.bind(this);

        switch (data.type) {
          case "init": {
            const eventType = data.data.eventType ?? "sync";
            if (eventType !== "sync") {
              console.warn("unsupported eventType", eventType);
              this.ws.close();
              return;
            }

            this.ws.send(
              json2emap({ type: "version", data: { version: this.version } }),
            );
            this.ws.send(
              json2emap({
                type: "initialData",
                data: {
                  id: this.id,
                  version: this.version,
                  serverId: init.serverId,
                },
              }),
            );

            if (this.version !== data.data.version) {
              this.ws.close();
              console.info("version mismatch", this.version, data.data.version);
              return;
            }

            if (init.eventCountSolver) {
              this.eventSendInterval = setInterval(() => {
                if (this.events.length > 0 && init.eventCountSolver) {
                  const count = init.eventCountSolver(this.events.length);
                  for (let i = 0; i < count; i++) {
                    if (this.events.length > 0) {
                      const [sendEvent, ...rest] = this.events;
                      this.events = rest;
                      if (sendEvent) {
                        this.ws.send(
                          json2emap({ type: "sync", data: sendEvent }),
                        );
                      }
                    }
                  }
                }
              }, 10);
            }
            this.logicManager = new LogicManager(init.app, init.logger, {
              connectionId: this.id,
              ownerId: data.data.ownerId,
              lang: data.data.lang,
              authUrl: this.authUrl,
              platformApiUrl: init.platformApiUrl,
              defaultAuthenticationToken: init.defaultAuthenticationToken,
            });
            this.logicManager.syncEventCallback = (event) => {
              if (init.eventCountSolver) {
                this.events.push(event);
              } else {
                this.ws.send(json2emap({ type: "sync", data: event }));
              }
              addEventCount();
            };
            break;
          }
          default:
            break;
        }
      } catch (e) {
        console.error(e);
      }
    });

    const clean = () => {
      this.logicManager?.close();
      this.logicManager = undefined;
      init.onClose(this);
      if (this.eventSendInterval) {
        clearInterval(this.eventSendInterval);
        this.eventSendInterval = undefined;
      }
      console.log("close", this.id);
    };

    this.ws.on("close", clean);

    setTimeout(() => {
      if (!this.logicManager) {
        console.warn("initialize timeout");
        clean();
        this.ws.close();
      }
    }, 5000);
  }
}
