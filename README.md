# mirage-x

TypeScript framework monorepo.

## Structure

- `packages/` — publishable packages (npm)
- `examples/` — private samples; `package.json` uses npm semver ranges, linked to local packages inside this repo

## Development

Requires Node.js `>=22.13` and [pnpm](https://pnpm.io) (see `packageManager` in the root `package.json`).

```bash
pnpm install
pnpm build
pnpm --filter @mirage-x/example-basic start
```
