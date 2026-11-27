# MirageX

Server-side React framework that syncs a Unit tree to a Resonite-side mirror over WebSocket.

Alpha-quality rewrite extracted from UniPocket into a publishable monorepo. APIs may change.

```bash
pnpm add @mirage-x/core @mirage-x/mirror react@18
# or: npm install @mirage-x/core @mirage-x/mirror react@18
```

Versions are `0.x`: a minor version (0.1 → 0.2) may break the API. See [CHANGELOG.md](CHANGELOG.md).

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

## Release

Both packages are released together with the same version.

1. Set `version` in `packages/core/package.json`, `packages/mirror/package.json` and `packages/core/src/version.ts` (and the ranges in `examples/basic/package.json`), and add the entry to `CHANGELOG.md`. Merge this to `master`.
2. Push a tag `v<version>` on that commit (`git tag v0.1.0 && git push origin v0.1.0`).
3. `.github/workflows/release.yml` checks the tag against both versions, builds, tests, packs (`workspace:^` becomes the real range) and publishes `@mirage-x/core`, then `@mirage-x/mirror`, with npm provenance. It authenticates with npm trusted publishing (OIDC): on npmjs.com, each package (`@mirage-x/core`, `@mirage-x/mirror`) has `rheniumNV/mirage-x`, workflow `release.yml`, as its trusted publisher, so no token is stored.

A trusted publisher can only be set on a package that already exists, so the very first publish used an `NPM_TOKEN` repository secret (npm falls back to it when OIDC is not set up). Remove the secret once trusted publishing is configured.
