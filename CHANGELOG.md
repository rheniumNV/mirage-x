# Changelog

`@mirage-x/core`, `@mirage-x/server` and `@mirage-x/mirror` are released together with the same version.

## 0.1.0

First npm release. Extracted from UniPocket's MirageX.

- `@mirage-x/core`: what the run time and the build time share: Unit definitions (`generateUnitConfig`, `UnitProp`, `UnitRef`), `MirrorRef`, the sync protocol types. No runtime dependencies.
- `@mirage-x/server`: the run time: `MirageXServer` (formerly `@mirage-x/core/server`), `generateMain`, `useMirrorRef`, `useBoundCallback`, `useMainRootContext`, `Logger`. Only the `sync` protocol (the `tree` mode was removed). `react` 18 is a peer dependency.
- `@mirage-x/mirror`: builds `output.brson` with [`@frdt/frdt`](https://www.npmjs.com/package/@frdt/frdt) instead of brson.js / VirtualObject, which uses much less memory.
  - Feedback (core, frames, units) is kept as Resonite `.brson` (`ResFeedback.brson`) and read at build time; JSON feedback is no longer read.
  - The output takes the oldest part's `VersionNumber` and the `FeatureFlags` every part has, and warns when parts are far apart.
  - Ids are renumbered from a fixed seed; an unchanged output is not rewritten.
  - `compareOutput` compares two outputs by structure and values.

Known limitations: `UnitProp.Slot`'s `dvMode` is not applied yet (always a `DynamicReferenceVariable<Slot>`, #1).
