# MirageX

Server-side React framework that syncs a Unit tree to a Resonite-side mirror over WebSocket.

You write a Resonite UI (or any object tree) as React components running on a Node.js server. The object you place in Resonite connects to that server and mirrors the tree: when the React state changes, Resonite updates.

- Status: `0.x`, extracted from UniPocket's MirageX. APIs may change; a minor version (0.1 → 0.2) may break them. See [CHANGELOG.md](CHANGELOG.md).
- This project is developed with generative AI coding tools (Claude Code). Changes are reviewed and tested by the maintainer, including in Resonite.

## How it works

```text
 build time                                    run time
┌─────────────────────────────┐              ┌───────────────────────────┐
│ @mirage-x/mirror            │  output.brson │ Resonite                  │
│  Units' Resonite templates  │ ───────────▶ │  the mirror object        │
│  (ResFeedback.brson)        │   (drag in)   │   │ WebSocket (sync)      │
│  + bundled core / frame     │              │   ▼                       │
└─────────────────────────────┘              │ @mirage-x/core server     │
                                             │  your React app (Units)   │
                                             └───────────────────────────┘
```

- A **Unit** is one kind of Resonite object (a text, an image, a panel …) with typed props. In React it is a component; in Resonite it is a template slot.
- **`@mirage-x/mirror`** (build time) assembles every Unit's template, the MirageX core and a frame into one `output.brson`. You drag it into Resonite (or let users spawn it).
- **`@mirage-x/core`** (run time) renders your React app on the server and sends the changes to the mirror, which instantiates Unit templates and sets their props.
- A Unit's look is made **in Resonite**: you edit its template there, save it, and pull it back into your project as `ResFeedback.brson` (the **feedback** step).

## Packages

| Package | Role |
| --- | --- |
| [`@mirage-x/core`](packages/core) | Run time: `MirageXServer`, Unit definitions (`UnitProp`, `generateUnitConfig`, `generateMain`), React reconciler |
| [`@mirage-x/mirror`](packages/mirror) | Build time: `build()` → `output.brson`; feedback (`fetchFeedback`, `attachUnits`) |

An app uses both. [`examples/basic`](examples/basic) is a complete app; the steps below follow it.

## Install

```bash
pnpm add @mirage-x/core @mirage-x/mirror react@18
# or
npm install @mirage-x/core @mirage-x/mirror react@18
```

Requires Node.js 22 or later. ESM only (`"type": "module"`). `react` 18 is a peer dependency of `@mirage-x/core`: your components and the runtime must share one React.

## Quick start

### 1. Define a Unit

One directory per Unit, at `src/unit/<Package>/<Unit>/`. The Unit's `code` is `"<Package>/<Unit>"` and must match the directory (feedback is attached by it).

`detail.ts` — the Unit's props:

```ts
import { UnitProp, generateUnitConfig } from "@mirage-x/core";

const detail = {
  code: "PrimitiveUix/PrimitiveText",
  propsConfig: {
    content: UnitProp.String(""),
    size: UnitProp.Float(64),
    color: UnitProp.Color([0, 0, 0, 1]),
  },
};

export const unitConfig = generateUnitConfig(detail);
```

`main.tsx` — the React component (run time):

```ts
import { generateMain } from "@mirage-x/core";
import { unitConfig } from "./detail.js";

export const O = generateMain(unitConfig);
```

`mirror.ts` — the Resonite template (build time). It reads the Unit's feedback when there is one; a Unit without feedback starts empty:

```ts
import { generateMirrorUnitFromFeedback, readFeedbackIfExists } from "@mirage-x/mirror";
import { unitConfig } from "./detail.js";

export const mirror = generateMirrorUnitFromFeedback({
  config: unitConfig,
  rawFeedback: readFeedbackIfExists(new URL("./ResFeedback.brson", import.meta.url)),
});
```

Collect them: `src/unit/main.ts` exports the components, `src/unit/mirror.ts` the templates, keyed by package and unit name:

```ts
// src/unit/main.ts
export { O as PrimitiveText } from "./PrimitiveUix/PrimitiveText/main.js";

// src/unit/mirror.ts
import { mirror as PrimitiveText } from "./PrimitiveUix/PrimitiveText/mirror.js";
export const units = { PrimitiveUix: { PrimitiveText } };
```

### 2. Write the app

```tsx
// src/app.tsx
import { PrimitiveText } from "./unit/main.js";

export const App = () => <PrimitiveText content="Hello MirageX" size={64} />;
```

A Unit takes the props declared in its `propsConfig`; slot properties such as `name` or `position` are declared there too (`position: UnitProp.Float3([0, 0, 0])`). It accepts children when its detail has `children: "multi"`. Slot references between Units (`useMirrorRef`, `UnitProp.Slot`, `UnitRef.Slot`) are described in [packages/core/docs/reference-prop.md](packages/core/docs/reference-prop.md).

### 3. Build `output.brson`

```ts
// src/build-mirror.ts
import { build, generateSimpleFrame } from "@mirage-x/mirror";
import { units } from "./unit/mirror.js";

await build(
  {
    appCode: "MyApp",
    outputPath: "output",
    cv: {
      mirage: {
        // Where the mirror connects. `fallback` is used when no cloud variable path is set.
        host: { path: "", ownerId: "", fallback: "localhost:3100" },
        useSsl: { path: "", fallback: false },
      },
    },
  },
  units,
  generateSimpleFrame, // or generateInstallFrame
);
```

This writes `output/output.brson` and `output/version.json`. When the output has not changed, nothing is written. Rebuild after changing Units or their feedback.

### 4. Start the server

```ts
// src/server.ts
import http from "node:http";
import { Logger } from "@mirage-x/core";
import { MirageXServer } from "@mirage-x/core/server";
import express from "express";
import { WebSocketServer } from "ws";
import { App } from "./app.js";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
app.use(express.json());

const mirageX = new MirageXServer(App, new Logger({ contextName: "my-app", logLevel: "info" }), {
  mirage: {
    url: "http://localhost:3100/",
    port: "3100",
    serverId: "my-app",
    apiPath: {
      info: "/info",
      output: "/output.brson",
      auth: "/auth/:connectionId",
      interactionEvent: "/events",
      websocket: "/ws",
    },
  },
  main: { appCode: "MyApp", outputPath: "output/output.brson", versionPath: "output/version.json" },
  auth: { url: "https://auth.example.local/" },
  platform: { api: { url: "https://api.resonite.com/" } },
});
mirageX.route(app, wss);

server.listen(3100);
```

The server also serves the built object at `/output.brson`. See [examples/basic/src/server.ts](examples/basic/src/server.ts) for error handling and reloading `version.json` during development.

### 5. Open it in Resonite

Drag `output/output.brson` into a world. The object connects to the server and shows the app.

## Shaping Units in Resonite (feedback)

A new Unit's template is empty. You give it its look in Resonite and pull it back into the project:

1. In Resonite, edit the Unit's template under its `Main` slot (materials, layout, components …). For each value prop, point the `Props.<name>` dynamic field in the Unit's `DV/Props` at the field it should drive.
2. Save the object into a **public inventory folder** and copy the folder's `resrec:///...` link.
3. In your project, fetch the latest item in that folder and attach each Unit's part to `src/unit/<Package>/<Unit>/ResFeedback.brson`:

   ```ts
   // src/dev/resFeedback/feedbackUnit.ts
   import path from "node:path";
   import { fileURLToPath } from "node:url";
   import { attachUnits, fetchFeedback } from "@mirage-x/mirror";

   const feedbackDir = path.dirname(fileURLToPath(import.meta.url)); // staging (gitignore its files)
   const unitsRoot = path.resolve(feedbackDir, "../../unit");

   await fetchFeedback({ link: process.env.FEEDBACK_LINK!, outputPath: feedbackDir });
   attachUnits({ feedbackDir, unitsRoot, matchPattern: process.argv[2] ?? ".+" }); // e.g. "PrimitiveUix/.+"
   ```

   Gitignore the staging files `ResFeedbackOriginal.brson` and `ResFeedbackMetaOriginal.json`; commit each Unit's `ResFeedback.brson` (and `ResFeedbackMeta.json`).
4. Rebuild `output.brson`.

On attach, the developer's local connection settings (`Static.Web.Host`, `http://` / `ws://` URLs) are cleared, and a Unit whose content did not change is not rewritten.

## Resonite versions of the parts

The output is made of parts saved by Resonite at different times: the core and frame bundled in `@mirage-x/mirror`, and each Unit's feedback.

- The output's `VersionNumber` is the oldest part's, and its `FeatureFlags` are the ones every part has, so Resonite converts data saved by older versions when it loads the output. That conversion runs on the whole output, so keep the parts close to each other when you can.
- `build` warns when the parts are more than 90 days apart, when a feature flag is left out or differs, and when a part's `TypeVersions` entry differs from the output's.
- A Unit without feedback takes the core's version and does not lower the output's.

## Migrating from UniPocket's MirageX

- The mirror pipeline (`res()`) is now `build()` from `@mirage-x/mirror`. It uses [`@frdt/frdt`](https://www.npmjs.com/package/@frdt/frdt) instead of brson.js / VirtualObject and uses much less memory.
- Feedback is Resonite `.brson` (`ResFeedback.brson`); JSON feedback is no longer read. Re-attach each Unit's feedback from Resonite (see above).
- Only the `sync` protocol is supported; the `tree` mode was removed.
- `@uni-pocket/*` is not needed; `Logger` is in `@mirage-x/core`.

## Examples

| Example | Role |
| --- | --- |
| [`examples/basic`](examples/basic) | A UIX panel and a Slot reference demo (mirror build, server, unit feedback) |

## Development

Requires Node.js `>=22.13` and [pnpm](https://pnpm.io). The pnpm version is pinned by `packageManager` in the root `package.json`; any recent pnpm (10+) switches to it automatically. Corepack is not required (it is no longer bundled with Node.js 25+).

```bash
pnpm install
pnpm build
pnpm typecheck   # builds packages, then type-checks packages and examples
pnpm test        # builds packages, then runs each package's tests
pnpm --filter @mirage-x/example-basic build:mirror
pnpm --filter @mirage-x/example-basic start
```

Example `package.json` files use npm semver ranges. Inside this monorepo, pnpm links them to the local packages.

CI (`.github/workflows/ci.yml`) runs install, build, typecheck, test and the example `build:mirror` on every pull request, then compares the example output with `examples/basic/baseline/output.brson` by structure and values (ids and the app version are not compared). When a change is meant to change the output (new feedback, a change in `mirror`), update the baseline in the same pull request:

```bash
pnpm --filter @mirage-x/example-basic build:mirror
pnpm --filter @mirage-x/example-basic baseline:update
```

```text
packages/
  core/      @mirage-x/core
  mirror/    @mirage-x/mirror (assets/: bundled core and frames)
examples/
  basic/
```

### Updating the bundled core and frames

`packages/mirror/assets/` holds the MirageX core and the frames as Resonite `.brson`. To update them from Resonite:

1. Copy `packages/mirror/.env.example` to `.env` and set `FEEDBACK_LINK` to the folder's `resrec:///...` link.
2. Run:

   ```bash
   pnpm --filter @mirage-x/mirror feedback
   # = feedback:fetch, then
   #   feedback:attach:core           → assets/core/ResFeedback.brson
   #   feedback:attach:frame:simple   → assets/frame/simpleFrame/ResFeedback.brson
   #   feedback:attach:frame:install  → assets/frame/installFrame/ResFeedback.brson
   ```

The fetched item is staged as `packages/mirror/scripts/feedback/ResFeedbackOriginal.brson` (gitignored), byte for byte. A root named `Holder` is unwrapped. A frame is updated only when its `Static.FrameCode` matches (`Simple` / `InstalledAvatar`). Parts are read at build time, so `mirror` does not need rebuilding.

## Release

Both packages are released together with the same version.

1. Set `version` in `packages/core/package.json`, `packages/mirror/package.json` and `packages/core/src/version.ts` (and the ranges in `examples/basic/package.json`), and add the entry to `CHANGELOG.md`. Merge this to `master`.
2. Push a tag `v<version>` on that commit (`git tag v0.1.0 && git push origin v0.1.0`).
3. `.github/workflows/release.yml` checks the tag against both versions, builds, tests, packs (`workspace:^` becomes the real range) and publishes `@mirage-x/core`, then `@mirage-x/mirror`, with npm provenance. It authenticates with npm trusted publishing (OIDC), so no token is stored: on npmjs.com, each package has GitHub Actions `rheniumNV` / `mirage-x` / `release.yml` as its trusted publisher. A version that is already on npm is skipped.

A trusted publisher can only be added to a package that already exists, and a new one expires unless it publishes within 2 days. So 0.1.0 was published by hand, and the trusted publishers are added right before the next release. Without them, npm falls back to an `NPM_TOKEN` repository secret if one is set.

## License

[MIT](LICENSE)
