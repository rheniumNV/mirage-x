export { version } from "./version.js";
export { Logger } from "./logger/index.js";
export type { LogLevel } from "./logger/index.js";

export { generateMain } from "./unit/main/index.js";
export { generateUnitConfig, UnitProp, UnitRef } from "./unit/common/index.js";
export type {
  DetailBase,
  UnitConfig,
  RefConfig,
  getMainProps,
  getDefaultProps,
  getMirrorProps,
  getWebProps,
} from "./unit/common/index.js";

export type { FunctionEnv, Language } from "./common/interactionEvent.js";
export { languages } from "./common/interactionEvent.js";
export { useBoundCallback } from "./common/useBoundCallback.js";
export { noop } from "./common/noop.js";
export {
  useMirrorRef,
  createMirrorRef,
  isMirrorRef,
} from "./common/useMirrorRef.js";
export type {
  MirrorRef,
  MirrorRefOption,
  MirrorRefBindMeta,
} from "./common/mirrorRef.js";
export type { RefType } from "./common/mainProp.js";

export { useMainRootContext } from "./main/index.js";
export type {
  Authentication,
  MainRootContextValue,
} from "./main/index.js";
