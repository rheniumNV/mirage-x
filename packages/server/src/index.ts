// Run time: renders your React app and syncs it to the mirror in Resonite.
export { MirageXServer } from "./server/index.js";
export type { MirageXServerConfig } from "./server/index.js";

export { generateMain } from "./unit/generateMain.js";
export { useMirrorRef } from "./hooks/useMirrorRef.js";
export { useBoundCallback } from "./hooks/useBoundCallback.js";
export { useMainRootContext } from "./main/index.js";
export type { Authentication, MainRootContextValue } from "./main/index.js";

export { Logger } from "./logger/index.js";
export type { LogLevel } from "./logger/index.js";
