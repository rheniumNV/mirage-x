import type { Document, Slot, Value } from "@frdt/frdt";

import { allSlots, str, bool, stringOf } from "../frdt/util.js";

/**
 * A saved item can come wrapped in a `Holder` slot. Returns the document of
 * its first child in that case, otherwise `doc` itself.
 */
export const unwrapHolder = (doc: Document): Document => {
  const root = doc.root();
  const [first] = root.children();
  if (root.name() !== "Holder" || !first) {
    return doc;
  }
  return doc.extract(first, { unresolved: "null" }).document();
};

const FRAMEWORK = "[FrooxEngine]FrooxEngine.";

/** Dynamic variables that hold a host or URL to connect to. */
const HOST_VARIABLES = new Set([
  "Static.Web.Host",
  "Static.Web.Url.Ws",
  "Static.Web.Url.Http",
  "Env.Host.Fallback",
]);

const isDebugUrl = (url: string) =>
  url.includes("http://") || url.includes("ws://");

/** The host name in a host (`name:port`) or a URL. */
const hostOf = (value: string): string => {
  const withoutScheme = value.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const authority = withoutScheme.split(/[/?#]/)[0] ?? "";
  const host = authority.includes("@")
    ? authority.slice(authority.lastIndexOf("@") + 1)
    : authority;
  if (host.startsWith("[")) {
    return host.slice(1, host.indexOf("]")).toLowerCase();
  }
  return host.split(":")[0]!.toLowerCase();
};

/** A host on the developer's machine or network (loopback, private, .local). */
const isLocalHost = (host: string): boolean => {
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "::1" ||
    host === "0.0.0.0"
  ) {
    return true;
  }
  const ip = host.split(".").map(Number);
  if (ip.length !== 4 || ip.some((n) => !Number.isInteger(n))) {
    return false;
  }
  const [a, b] = ip as [number, number, number, number];
  return (
    a === 127 ||
    a === 10 ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 169 && b === 254)
  );
};

/** A value saved from a local session: a debug URL or a local host. */
export const isDevelopmentValue = (value: string) =>
  isDebugUrl(value) || isLocalHost(hostOf(value));

/**
 * Read a field, `undefined` when the component has no such field or its value
 * is not one frdt can read as a value.
 */
const read = (slot: Slot, i: number, field: string): Value | null | undefined => {
  try {
    return slot.tryComponentValue(i, field);
  } catch {
    return undefined;
  }
};

/**
 * Clear the developer's local connection settings that a feedback picks up
 * while it is saved from a local session (local hosts such as `localhost` or
 * a private IP, debug `http://` / `ws://` URLs, a connected
 * `WebsocketClient`). MirageX sets these at run time. Other values, such as
 * the production host of another app embedded in a frame, are kept. Returns
 * how many fields were changed.
 */
export const sanitizeFeedback = (doc: Document): number => {
  let changed = 0;
  const clear = (slot: Slot, i: number, field: string, value: Value) => {
    slot.setComponentValue(i, field, value);
    changed++;
  };

  for (const slot of allSlots(doc.root())) {
    slot.components().forEach(({ typeName }, i) => {
      if (typeName === `${FRAMEWORK}DynamicValueVariable<string>`) {
        const name = stringOf(read(slot, i, "VariableName"));
        const value = stringOf(read(slot, i, "Value"));
        if (
          name &&
          HOST_VARIABLES.has(name) &&
          value &&
          isDevelopmentValue(value)
        ) {
          clear(slot, i, "Value", str(""));
        }
        return;
      }
      if (typeName.startsWith(`${FRAMEWORK}CloudValueVariableDriver<`)) {
        const fallback = stringOf(read(slot, i, "FallbackValue"));
        if (fallback && isDebugUrl(fallback)) {
          clear(slot, i, "FallbackValue", str(""));
        }
        return;
      }
      if (typeName === `${FRAMEWORK}StaticBinary`) {
        const url = stringOf(read(slot, i, "URL"));
        if (url && isDebugUrl(url)) {
          clear(slot, i, "URL", str(""));
        }
        return;
      }
      if (typeName === `${FRAMEWORK}WebsocketClient`) {
        const url = stringOf(read(slot, i, "URL"));
        if (url && isDebugUrl(url)) {
          clear(slot, i, "URL", str(""));
          clear(slot, i, "IsConnected", bool(false));
        }
      }
    });
  }
  return changed;
};
