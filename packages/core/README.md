[English](https://github.com/rheniumNV/mirage-x/blob/master/packages/core/README.md) | [日本語](https://github.com/rheniumNV/mirage-x/blob/master/packages/core/README.ja.md)

# @mirage-x/core

The shared part of [MirageX](https://github.com/rheniumNV/mirage-x#readme), a server-side React framework that syncs a Unit tree to a Resonite-side mirror over WebSocket.

It holds what the run time and the build time both use:

- Unit definitions: `generateUnitConfig`, `UnitProp`, `UnitRef` and their types (`DetailBase`, `UnitConfig`, `getMainProps` …)
- `MirrorRef` (`createMirrorRef`, `isMirrorRef`) and `FunctionEnv`
- The types of the sync protocol between the server and the mirror

It has no runtime dependencies. Slot references are described in [docs/reference-prop.md](https://github.com/rheniumNV/mirage-x/blob/master/packages/core/docs/reference-prop.md).

MirageX is published as three packages, used together: [`@mirage-x/core`](https://www.npmjs.com/package/@mirage-x/core) (shared Unit definitions), [`@mirage-x/server`](https://www.npmjs.com/package/@mirage-x/server) (run time) and [`@mirage-x/mirror`](https://www.npmjs.com/package/@mirage-x/mirror) (build time). **See the [MirageX README](https://github.com/rheniumNV/mirage-x#readme) for how to use them**, and [`examples/basic`](https://github.com/rheniumNV/mirage-x/tree/master/examples/basic) for a complete app.

```bash
npm install @mirage-x/core @mirage-x/server @mirage-x/mirror react@18
```

Node.js 22 or later, ESM only. Keep the three packages at the same version.

## License

MIT

## Development with generative AI

This project is developed with generative AI coding tools (Claude Code). Changes are reviewed and tested by the maintainer, including in Resonite.
