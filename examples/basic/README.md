# @mirage-x/example-basic

Minimal MirageX world with a small UIX tree: blue `PrimitiveImage` panel and centered `Hello MirageX` text on a `Canvas`.

## Setup

From the repo root:

```bash
pnpm install
pnpm build
```

## Build the Resonite artifact

```bash
pnpm --filter @mirage-x/example-basic build:mirror
```

Writes `output/output.brson` and `output/version.json`. Re-run after changing Units or their `ResFeedback.json`.

## Start the server

```bash
pnpm --filter @mirage-x/example-basic start
# or with reload on source changes:
pnpm --filter @mirage-x/example-basic dev
```

Listens on `http://localhost:3100/`.

## Use in Resonite

Drag `examples/basic/output/output.brson` into a Resonite world. The object will connect to the local MirageX server and show the sample UIX.

## Unit feedback (Resonite → ResFeedback.json)

Edit units in Resonite (materials, layout, etc.), save the object into a public inventory **folder**, then pull that folder into the repo:

1. Copy [`.env.example`](.env.example) to `.env` and set `FEEDBACK_LINK` to the folder `resrec:///...` link.
2. Fetch and attach (default pattern `PrimitiveUix/.+`):

```bash
pnpm --filter @mirage-x/example-basic feedback:unit
# or one unit:
pnpm --filter @mirage-x/example-basic feedback:unit -- "PrimitiveUix/PrimitiveImage"
```

3. Rebuild the artifact:

```bash
pnpm --filter @mirage-x/example-basic build:mirror
```

Staging files land in `src/dev/resFeedback/` (`ResFeedbackOriginal.json`). Per-unit outputs are `src/unit/<Package>/<Unit>/ResFeedback.json` (+ `.yaml` / `Meta` when changed).
