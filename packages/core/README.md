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
- No dependency on `@uni-pocket/*`; `Logger` lives in this package.
- Unit/res mirror tooling, client attach scripts, and web preview from UniPocket MirageX are intentionally omitted.
