import axios from "axios";
import { jwtVerify, importSPKI } from "jose";
import type { ReactElement } from "react";
import type { Logger } from "../logger/index.js";
import type {
  UnitChangeClientEvent,
  UnitChangeServerEvent,
} from "@mirage-x/core";
import type { Authentication } from "../main/index.js";
import type { MainRootProps } from "../main/mainRootProps.js";
import { DummyReactRenderer } from "./dummyReactRenderer.js";
import { render } from "./render.js";

/** Tracks which units have been sent to the client, to order sync events. */
type UnitInstance = {
  id: string;
  parentId: string;
  code: string;
  generated: boolean;
};

const isValidUnit = (
  event: Exclude<UnitChangeServerEvent, { type: "customEvent" }>,
  unitMap: Map<string, UnitInstance>,
): boolean => {
  const unit = unitMap.get(event.unit.id);
  if (!unit) {
    return false;
  }

  const checkParent = (id: string): boolean => {
    if (id === "root") {
      return true;
    }
    const parent = unitMap.get(id);
    if (!parent?.parentId) {
      return false;
    }
    return parent.generated && checkParent(parent.parentId);
  };

  switch (event.type) {
    case "generateUnit":
      return checkParent(event.unit.parentId);
    case "destroyUnit":
      return unit.generated;
    case "updateProp":
      return unit.generated;
    default:
      return false;
  }
};

export class LogicManager {
  unitMap = new Map<string, UnitInstance>();
  ownerId: string;
  lang: string;
  authentication: Authentication | undefined;
  authUrl: string;
  closed = false;

  syncEventCallback?: (event: UnitChangeClientEvent) => unknown;
  syncFunctionMap: Map<string, (...args: unknown[]) => unknown> = new Map();

  unitUsages: Map<string, number> = new Map();
  propsSetter: (props: MainRootProps) => void = () => {};

  constructor(
    app: () => ReactElement,
    private logger: Logger,
    init: {
      connectionId: string;
      ownerId: string;
      lang: string;
      authUrl: string;
      platformApiUrl: string;
      defaultAuthenticationToken?: string;
      /**
       * Where the sync events go. Set before the app is rendered: the first
       * render (and its effects) runs inside this constructor.
       */
      syncEventCallback?: (event: UnitChangeClientEvent) => unknown;
    },
  ) {
    this.syncEventCallback = init.syncEventCallback;
    this.ownerId = init.ownerId;
    this.lang = init.lang;
    this.authUrl = init.authUrl;
    console.info("init", init);

    this.authentication = init.defaultAuthenticationToken
      ? {
          token: init.defaultAuthenticationToken,
          clearAuth: this.clearAuth.bind(this),
        }
      : undefined;

    DummyReactRenderer.render(
      render(
        app,
        this.logger.generateChildLogger({ contextName: "render" }),
      )({
        connectionId: init.connectionId,
        ownerId: this.ownerId,
        lang: this.lang,
        eventEmitter: this.emitEvent.bind(this),
        functionMap: this.syncFunctionMap,
        propsSetterRegister: ((setter: (props: MainRootProps) => void) => {
          this.propsSetter = setter;
        }).bind(this),
        platformApiUrl: init.platformApiUrl,
        defaultAuthentication: this.authentication,
      }),
    );
  }

  emitEvent(event: UnitChangeServerEvent) {
    switch (event.type) {
      case "generateUnit":
        if (!this.unitUsages.has(event.unit.code)) {
          event.unit.defaultProps.forEach((prop) => {
            this.syncEventCallback?.({
              type: "initUnitPropOrigin",
              unit: {
                code: event.unit.code,
                prop,
              },
            });
          });
        }
        this.unitUsages.set(
          event.unit.code,
          (this.unitUsages.get(event.unit.code) ?? 0) + 1,
        );
        this.unitMap.set(event.unit.id, {
          id: event.unit.id,
          parentId: event.unit.parentId,
          code: event.unit.code,
          generated: false,
        });
        break;
      case "destroyUnit": {
        const generated = this.unitMap.get(event.unit.id)?.generated;
        this.unitMap.delete(event.unit.id);
        // The client never had it (it was removed while it waited for its
        // parent), so there is nothing to destroy.
        if (!generated) return;
        break;
      }
      case "updateProp":
        // Sent once the unit itself has been generated (see isValidUnit).
        break;
      case "customEvent":
        this.syncEventCallback?.(event);
        return;
      default:
        return;
    }

    const sendEvent = () => {
      this.syncEventCallback?.(event);
      if (event.type === "generateUnit") {
        const unit = this.unitMap.get(event.unit.id);
        // In place: a waiting event checks it still has the same entry.
        if (unit) unit.generated = true;
      }
    };

    if (event.type === "destroyUnit" || isValidUnit(event, this.unitMap)) {
      sendEvent();
    } else {
      const entry = this.unitMap.get(event.unit.id);
      const wait4Send = () => {
        setTimeout(() => {
          // Stop once nothing can send it: the manager is closed, or the unit
          // was removed before it could be generated. A unit shown again with
          // the same id (`<Activity>`) has a new entry and its own events.
          if (this.closed || this.unitMap.get(event.unit.id) !== entry) return;
          if (isValidUnit(event, this.unitMap)) {
            sendEvent();
          } else {
            wait4Send();
          }
        }, 1);
      };
      wait4Send();
    }
  }

  close() {
    this.closed = true;
    this.syncProps();
    this.unitMap.clear();
    this.unitUsages.clear();
    this.syncFunctionMap.clear();
    this.authentication = undefined;
    this.syncEventCallback = undefined;
    this.propsSetter = () => {};
    console.info("close logic", this.ownerId);
  }

  /**
   * Rendered before returning (when called outside React's own work), so that
   * `close()` has unmounted the units, and run their cleanups, before it
   * clears the maps.
   */
  syncProps() {
    DummyReactRenderer.flushSync(() => {
      this.propsSetter({
        authentication: this.authentication,
        closed: this.closed,
      });
    });
  }

  async clearAuth() {
    this.authentication = undefined;
    this.syncProps();
  }

  async auth({ token }: { token: string }) {
    try {
      const response = await axios.get(`${this.authUrl}api/publicKey`);
      const publicKey = await importSPKI(response.data.key, "EdDSA");
      const verified = await jwtVerify(token, publicKey, {
        algorithms: ["EdDSA"],
      });

      if (
        !this.ownerId ||
        verified?.payload?.resoniteUserId !== this.ownerId ||
        !(
          typeof verified.payload.exp === "number" &&
          verified.payload.exp > Date.now() / 1000
        )
      ) {
        console.warn(
          "auth failed",
          verified.payload.resoniteUserId,
          this.ownerId,
        );
        return;
      }

      this.authentication = { token, clearAuth: this.clearAuth.bind(this) };
      this.syncProps();
      console.info("auth success", verified.payload.resoniteUserId);
    } catch (e) {
      console.error("auth failed", e);
    }
  }
}
