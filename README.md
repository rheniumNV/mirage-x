# MirageX

Server-side React framework that syncs a Unit tree to a Resonite-side mirror over WebSocket.

Alpha-quality rewrite extracted from UniPocket into a publishable monorepo. APIs may change.

## Packages

| Package | Role |
| --- | --- |
| [`@mirage-x/virtual-object`](packages/virtual-object) | Virtual slot / component / field tree |
| [`@mirage-x/core`](packages/core) | Runtime: `MirageXServer`, Units, React reconciler |
| [`@mirage-x/mirror`](packages/mirror) | Build-time pipeline: `build()` → `output.brson` |

## Examples

| Example | Role |
| --- | --- |
| [`examples/basic`](examples/basic) | Minimal world (mirror build + server) |

Example `package.json` files use npm semver ranges. Inside this monorepo, pnpm links them to local packages.

## Development

Requires Node.js `>=22.13` and [pnpm](https://pnpm.io) (`packageManager` in the root `package.json`).

```bash
pnpm install
pnpm build
pnpm --filter @mirage-x/example-basic build:mirror
pnpm --filter @mirage-x/example-basic start
```

Then drag `examples/basic/output/output.brson` into Resonite. See [examples/basic/README.md](examples/basic/README.md).

## Layout

```text
packages/
  virtual-object/
  core/
  mirror/
examples/
  basic/
```
