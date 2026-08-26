# @mirage-x/mirror

Builds Resonite mirror assets (`output.brson` / `output.json` / `output.yaml`) from MirageX unit virtual objects and embedded ResFeedback templates.

## Install

Workspace dependency:

```ts
import {
  build,
  generateMirrorUnitFromFeedback,
  generateSimpleFrame,
  generateInstallFrame,
  fetchFeedback,
  attachUnits,
} from "@mirage-x/mirror";
```

## Usage

1. Build unit trees with `generateMirrorUnitFromFeedback` (or your own `VirtualContext` units).
2. Call `build(config, units, generateSimpleFrame | generateInstallFrame)`.
3. Artifacts are written under `config.outputPath` when the tree changed vs the previous `output.yaml`.

`build` is the renamed UniPocket MirageX `res()` pipeline entrypoint.

## Feedback

Pull a Resonite inventory folder object and slice unit packages into per-unit `ResFeedback.json`:

```ts
await fetchFeedback({ link: process.env.FEEDBACK_LINK!, outputPath: feedbackDir });
attachUnits({
  feedbackDir,
  unitsRoot,
  matchPattern: "PrimitiveUix/.+",
});
```

See `examples/basic` for a full CLI wiring.
