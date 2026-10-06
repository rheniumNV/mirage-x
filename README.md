# MirageX

Server-side React framework that syncs a Unit tree to a Resonite-side mirror over WebSocket.

Alpha-quality rewrite extracted from UniPocket into a publishable monorepo. APIs may change.

## Packages

| Package | Role |
| --- | --- |
| [`@mirage-x/core`](packages/core) | Runtime: `MirageXServer`, Units, React reconciler |
| [`@mirage-x/mirror`](packages/mirror) | Build-time pipeline: `build()` → `output.brson` |

## Examples

| Example | Role |
| --- | --- |
| [`examples/basic`](examples/basic) | Minimal world (mirror build + server) |

Example `package.json` files use npm semver ranges. Inside this monorepo, pnpm links them to local packages.

## Development

Requires Node.js `>=22.13` and [pnpm](https://pnpm.io). The pnpm version is pinned by `packageManager` in the root `package.json`; any recent pnpm (10+) switches to it automatically. Corepack is not required (it is no longer bundled with Node.js 25+).

```bash
pnpm install
pnpm build
pnpm typecheck   # builds packages, then type-checks packages and examples
pnpm test        # builds packages, then runs each package's tests
pnpm --filter @mirage-x/example-basic build:mirror
pnpm --filter @mirage-x/example-basic start
```

CI (`.github/workflows/ci.yml`) runs install, build, typecheck, test and the example `build:mirror` on every pull request, then compares the example output with `examples/basic/baseline/output.brson` by structure and values (ids and the app version are not compared).

When a change is meant to change the output (new feedback, a change in `mirror`), update the baseline in the same pull request:

```bash
pnpm --filter @mirage-x/example-basic build:mirror
pnpm --filter @mirage-x/example-basic baseline:update
```

Then drag `examples/basic/output/output.brson` into Resonite. See [examples/basic/README.md](examples/basic/README.md).

## Layout

```text
packages/
  core/
  mirror/
examples/
  basic/
```
