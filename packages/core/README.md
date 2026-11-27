[English](https://github.com/rheniumNV/mirage-x/blob/master/packages/core/README.md) | [日本語](https://github.com/rheniumNV/mirage-x/blob/master/packages/core/README.ja.md)

# @mirage-x/core

The run-time half of [MirageX](https://github.com/rheniumNV/mirage-x#readme), a server-side React framework that syncs a Unit tree to a Resonite-side mirror over WebSocket.

It provides:

- Unit definitions: `generateUnitConfig`, `UnitProp`, `UnitRef`, `generateMain` (a Unit as a React component)
- `MirageXServer` (`@mirage-x/core/server`): renders your React app and sends its changes to the mirror in Resonite
- Hooks and helpers: `useMirrorRef`, `useBoundCallback`, `useMainRootContext`, `FunctionEnv`, `Logger`

An app also needs [`@mirage-x/mirror`](https://www.npmjs.com/package/@mirage-x/mirror), which builds the object you place in Resonite. **See the [MirageX README](https://github.com/rheniumNV/mirage-x#readme) for how to use them together**, and [`examples/basic`](https://github.com/rheniumNV/mirage-x/tree/master/examples/basic) for a complete app.

```bash
npm install @mirage-x/core @mirage-x/mirror react@18
```

Node.js 22 or later, ESM only. `react` 18 is a peer dependency.

This project is developed with generative AI coding tools (Claude Code); changes are reviewed and tested by the maintainer.

## License

MIT
