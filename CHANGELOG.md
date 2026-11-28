# Changelog

`@mirage-x/core`, `@mirage-x/server` and `@mirage-x/mirror` are released together with the same version.

## 0.1.1

- `@mirage-x/server`:
  - Export `useLogger` and `LogContext`, so components can log through the logger given to `MirageXServer` (`useLogger()` returns its child with the context name `render` and throws outside MirageX's render; `<LogContext contextName="...">` gives a subtree its own child logger).
  - Rendering is synchronous on React 19 (0.1.0 left it to React's scheduler). When a connection's app has been rendered, and when a handler for an event from Resonite returns, the Units have been rendered and their effects have run; updates made in effects are rendered in the same pass. Other updates, such as those after an `await` or in a timer, are rendered in a microtask. Transitions (`startTransition`, `useDeferredValue`) are still deferred.
  - An effect that keeps setting state now stops with React's "Maximum update depth exceeded" error after about 50 renders, and the app unmounts, instead of re-rendering forever.
  - Fixed: a connection closed right after it opened left its app mounted, and an authentication change (`auth` / `clearAuth`) made before the app's first effects was lost.
  - Fixed: a Suspense boundary whose data was ready within 300 ms of showing its fallback did not show its content.
  - Fixed: a sync event waiting for its parent Unit was retried every millisecond forever once the connection closed or the Unit was removed, and a `destroyUnit` was sent for a removed Unit the mirror never had.
  - Fixed: a connection closed within 5 seconds of opening logged "initialize timeout" and was cleaned up twice.
- `@mirage-x/mirror`:
  - `generateSimpleFrameFromFeedback(feedback)` / `generateInstallFrameFromFeedback(feedback)` build a frame from your own frame feedback (a `.brson` path or URL, or a `Document`). `placeCore` and `parentOf` are exported for frames that need more control.
  - `versionSource` option of `build()` / `generateClient()` (type `VersionSource`): `"oldest"` (default, unchanged) or `"frame"`, which keeps the frame's `VersionNumber` and `FeatureFlags` as they are and warns about flags the frame and the other parts do not share.

## 0.1.0

First release.

- `@mirage-x/core`: what the run time and the build time share.
  - Unit definitions: `generateUnitConfig`, `UnitProp`, `UnitRef`
  - Slot references between Units: `MirrorRef` (`createMirrorRef`, `isMirrorRef`)
  - The types of the sync protocol between the server and the mirror in Resonite
  - No runtime dependencies.
- `@mirage-x/server`: the run time.
  - `MirageXServer`: renders a React app on the server and syncs its Units to the mirror in Resonite over WebSocket (express + ws)
  - `generateMain`: a Unit as a React component
  - Hooks: `useMirrorRef`, `useBoundCallback`, `useMainRootContext`
  - `Logger`
  - `react` 19 (19.3 or later) is a peer dependency.
- `@mirage-x/mirror`: the build time.
  - `build()`: assembles the Units' templates, the bundled core and a frame (`generateSimpleFrame` / `generateInstallFrame`) into `output.brson`, using [`@frdt/frdt`](https://www.npmjs.com/package/@frdt/frdt). Ids are renumbered from a fixed seed, and an unchanged output is not rewritten.
  - `generateMirrorUnitFromFeedback`: a Unit's template, from its feedback (`ResFeedback.brson`, as saved by Resonite) when there is one.
  - Feedback: `fetchFeedback` and `attachUnits` pull the Units shaped in Resonite into a project.
  - The output's `VersionNumber` is the oldest of the core's, the frame's and the Units', with the `FeatureFlags` all of them have; `build` warns when they are far apart.
  - `compareOutput`: compares two outputs by structure and values.

Known limitations: `UnitProp.Slot`'s `dvMode` is not applied yet; a Slot prop is always a `DynamicReferenceVariable<Slot>` ([#1](https://github.com/rheniumNV/mirage-x/issues/1)).
