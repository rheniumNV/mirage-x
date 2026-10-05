# @mirage-x/core

MirageX React runtime for Resonite UIX apps.

## Install

```bash
pnpm add @mirage-x/core
```

## Exports

| Entry | Contents |
| --- | --- |
| `@mirage-x/core` | App APIs: `generateMain`, `UnitProp`, `UnitRef`, `generateUnitConfig`, `FunctionEnv`, `useBoundCallback`, `useMirrorRef`, `noop`, `useMainRootContext`, `Logger`, `version` |
| `@mirage-x/core/server` | `MirageXServer` (+ config types) |

## Slot references

- Every Unit: `rootSlotRef` → wire `option: { refType: "RootSlot" }`
- `refsConfig` + `UnitRef.Slot()` → `DV/Refs.*` and wire `option: { refType: "Slot", refKey }`
- Consumer: `UnitProp.Slot()` → `Props.*` DRV

See [docs/reference-prop.md](docs/reference-prop.md).

## Notes

- ESM only (`"type": "module"`).
- Only the `sync` protocol is supported. The client's `init` may send `eventType: "sync"` or omit it; any other value (the removed `tree` mode) is rejected and the socket is closed.
- No dependency on `@uni-pocket/*`; `Logger` lives in this package.
- Unit/res mirror tooling, client attach scripts, and web preview from UniPocket MirageX are intentionally omitted.
