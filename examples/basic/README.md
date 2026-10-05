# @mirage-x/example-basic

Minimal MirageX world: UIX panel plus a **Slot ref** demo (`useMirrorRef`).

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

## Slot ref demo

[`src/app.tsx`](src/app.tsx) wires:

```tsx
const rootSlotRef = useMirrorRef();
<SlotHost rootSlotRef={rootSlotRef} />
<SlotTarget parent={rootSlotRef} />
```

- Every Unit accepts `rootSlotRef` → sync `option: { refType: "RootSlot" }` (unit root / `Static.Ref`)
- `Demo/SlotHost` also has `refsConfig.anchor` → mirror `DV/Refs.anchor` (named Slot export)
- `Demo/SlotTarget.parent` is `UnitProp.Slot` → consumer `Props.parent` DRV

After you add the Resonite Flux branches for `Reference` (`RootSlot` / `Slot`+`refKey`), see `@mirage-x/core` [docs/reference-prop.md](../../packages/core/docs/reference-prop.md).

## Unit feedback (Resonite → ResFeedback.json)

Edit units in Resonite (materials, layout, etc.), save the object into a public inventory **folder**, then pull that folder into the repo:

1. Copy [`.env.example`](.env.example) to `.env` and set `FEEDBACK_LINK` to the folder `resrec:///...` link.
2. Fetch and attach (default pattern `(PrimitiveUix|Demo)/.+`):

```bash
pnpm --filter @mirage-x/example-basic feedback:unit
# or one unit:
pnpm --filter @mirage-x/example-basic feedback:unit -- "Demo/SlotHost"
```

3. Rebuild the artifact:

```bash
pnpm --filter @mirage-x/example-basic build:mirror
```

Staging files land in `src/dev/resFeedback/` (`ResFeedbackOriginal.json`). Per-unit outputs are `src/unit/<Package>/<Unit>/ResFeedback.json` (+ `.yaml` / `Meta` when changed).
