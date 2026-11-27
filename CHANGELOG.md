# Changelog

`@mirage-x/core`, `@mirage-x/server` and `@mirage-x/mirror` are released together with the same version.

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
