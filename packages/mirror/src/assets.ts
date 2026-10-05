import { fileURLToPath } from "node:url";

/**
 * Absolute path of a file shipped under `packages/mirror/assets/`.
 * `src/assets.ts` and `dist/assets.js` sit at the same depth, so this works
 * both from source (tsx) and from the published build.
 */
export const assetPath = (relative: string): string =>
  fileURLToPath(new URL(`../assets/${relative}`, import.meta.url));
