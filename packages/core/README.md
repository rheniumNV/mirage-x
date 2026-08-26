# @mirage-x/core

MirageX React runtime for Resonite UIX apps.

## Install

```bash
pnpm add @mirage-x/core
```

## Exports

| Entry | Contents |
| --- | --- |
| `@mirage-x/core` | App APIs: `generateMain`, `UnitProp`, `generateUnitConfig`, `FunctionEnv`, `useBoundCallback`, `noop`, `useMainRootContext`, `Logger`, `version` |
| `@mirage-x/core/server` | `MirageXServer` (+ config types) |

## Notes

- ESM only (`"type": "module"`).
- No dependency on `@uni-pocket/*`; `Logger` lives in this package.
- Unit/res mirror tooling, client attach scripts, and web preview from UniPocket MirageX are intentionally omitted.
