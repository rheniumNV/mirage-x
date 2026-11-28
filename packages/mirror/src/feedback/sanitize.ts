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

/**
 * `DynamicValueVariable<string>`s that hold a host to connect to. (The
 * `Static.Web.Url.*` variables are `Uri`s driven from these at run time and
 * are left as they are.)
 */
const HOST_VARIABLES = new Set(["Static.Web.Host", "Env.Host.Fallback"]);

/** An unencrypted `http://` / `ws://` URL (`@` is how Resonite saves a Uri). */
const isDebugUrl = (value: string) => /^\s*@?(http|ws):\/\//i.test(value);

/** The host name in a host (`name:port`) or a URL, lower case. */
const hostOf = (value: string): string => {
  const withoutScheme = value
    .trim()
    .replace(/^@/, "")
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const authority = withoutScheme.split(/[/?#]/)[0] ?? "";
  const host = authority.slice(authority.lastIndexOf("@") + 1).toLowerCase();
  if (host.startsWith("[")) {
    return host.slice(1, host.indexOf("]"));
  }
  // A bare IPv6 address (more than one colon) has no port to strip.
  if (host.indexOf(":") !== host.lastIndexOf(":")) {
    return host;
  }
  return host.split(":")[0]!.replace(/\.$/, "");
};

/** The four parts of a dotted IPv4 address, or `null`. */
const ipv4Of = (host: string): number[] | null => {
  const parts = host.split(".");
  if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p))) {
    return null;
  }
  const numbers = parts.map(Number);
  return numbers.every((n) => n <= 255) ? numbers : null;
};

const isLocalIpv4 = ([a, b]: number[]): boolean =>
  a === 127 || // loopback
  a === 10 ||
  (a === 172 && b! >= 16 && b! <= 31) ||
  (a === 192 && b === 168) || // private
  (a === 100 && b! >= 64 && b! <= 127) || // shared (CGNAT, Tailscale)
  (a === 169 && b === 254) || // link-local
  a === 0; // this network (0.0.0.0)

const isLocalIpv6 = (host: string): boolean => {
  const mapped = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) {
    const ip = ipv4Of(mapped[1]!);
    return ip !== null && isLocalIpv4(ip);
  }
  return (
    /^(0*:)*:?0*1$/.test(host) || // ::1, 0:0:0:0:0:0:0:1
    /^(0*:)*:?0*$/.test(host) || // ::
    /^fe[89ab][0-9a-f]?:/.test(host) || // link-local
    /^f[cd][0-9a-f]{0,2}:/.test(host) // unique local
  );
};

/**
 * A host on the developer's machine or network: `localhost`, a name with no
 * dot (a PC on the LAN), a local domain (`.local`, `.lan`, `.internal`,
 * `.home.arpa`), or a loopback, private, shared or link-local IP.
 */
const isLocalHost = (host: string): boolean => {
  if (host === "") return false;
  if (host.includes(":")) return isLocalIpv6(host);
  const ip = ipv4Of(host);
  if (ip) return isLocalIpv4(ip);
  return (
    !host.includes(".") ||
    /\.(localhost|local|lan|internal|home\.arpa)$/.test(host)
  );
};

/** A value saved from a local session: a debug URL or a local host. */
export const isDevelopmentValue = (value: string) =>
  isDebugUrl(value) || isLocalHost(hostOf(value));

/**
 * A value that is a host or a URL (a scheme, a port, a dot, `localhost` or an
 * IP), not just any text. A cloud variable's fallback can be any string.
 */
const looksLikeHost = (value: string) => {
  const trimmed = value.trim().replace(/^@/, "");
  return (
    /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ||
    /^[^\s/]+:\d+(\/|$)/.test(trimmed) ||
    /^\[[0-9a-f:.%]+\]/i.test(trimmed) ||
    (/^[^\s/]+\.[^\s/]+/.test(trimmed) && !/\s/.test(trimmed)) ||
    hostOf(trimmed) === "localhost"
  );
};

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
 * while it is saved from a local session: a local host (see `isLocalHost`) or
 * a debug `http://` / `ws://` URL in `Static.Web.Host`, `Env.Host.Fallback`,
 * a cloud variable's fallback or a `WebsocketClient` (which is disconnected),
 * and a debug URL of a `StaticBinary`. MirageX sets its own at build and run
 * time. Other values, such as the production host of another app embedded in
 * a frame, are kept. Returns how many fields were changed.
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
        if (
          fallback &&
          looksLikeHost(fallback) &&
          isDevelopmentValue(fallback)
        ) {
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
        if (url && isDevelopmentValue(url)) {
          clear(slot, i, "URL", str(""));
          clear(slot, i, "IsConnected", bool(false));
        }
      }
    });
  }
  return changed;
};
