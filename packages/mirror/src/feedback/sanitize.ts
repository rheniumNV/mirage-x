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

/** Dynamic variables whose value is the developer's local host. */
const LOCAL_VARIABLES = new Set([
  "Static.Web.Host",
  "Static.Web.Url.Ws",
  "Static.Web.Url.Http",
  "Env.Host.Fallback",
]);

const isDebugUrl = (url: string) =>
  url.includes("http://") || url.includes("ws://");

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
 * while it is saved from a local session (host names, debug `http://` /
 * `ws://` URLs, a connected `WebsocketClient`). MirageX sets these at run
 * time. Returns how many fields were changed.
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
        if (name && LOCAL_VARIABLES.has(name) && value) {
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
