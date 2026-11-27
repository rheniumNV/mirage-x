// Shared by @mirage-x/server (run time) and @mirage-x/mirror (build time):
// Unit definitions, prop and ref types, and the sync protocol.
export { version } from "./version.js";

export { generateUnitConfig, UnitProp, UnitRef } from "./unit/index.js";
export type {
  DetailBase,
  UnitConfig,
  RefConfig,
  getMainProps,
  getDefaultProps,
  getMirrorProps,
  getWebProps,
} from "./unit/index.js";

export type { FunctionEnv, Language } from "./common/interactionEvent.js";
export { languages } from "./common/interactionEvent.js";
export { noop } from "./common/noop.js";
export { createMirrorRef, isMirrorRef } from "./common/mirrorRef.js";
export type {
  MirrorRef,
  MirrorRefOption,
  MirrorRefBindMeta,
} from "./common/mirrorRef.js";
export type { RefType, DvMode } from "./common/mainProp.js";

// The sync protocol between the server and the mirror in Resonite.
export type {
  UnitChangeServerEvent,
  UnitChangeClientEvent,
} from "./common/unitChangeEvent.js";
