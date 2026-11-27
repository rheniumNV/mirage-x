[English](https://github.com/rheniumNV/mirage-x/blob/master/packages/server/README.md) | [日本語](https://github.com/rheniumNV/mirage-x/blob/master/packages/server/README.ja.md)

# @mirage-x/server

The run-time part of [MirageX](https://github.com/rheniumNV/mirage-x#readme), a server-side React framework that syncs a Unit tree to a Resonite-side mirror over WebSocket.

- `MirageXServer`: renders your React app on the server and sends its changes to the mirror in Resonite (express + WebSocket)
- `generateMain`: a Unit as a React component
- Hooks: `useMirrorRef`, `useBoundCallback`, `useMainRootContext`
- `Logger`

`react` 19 (19.3 or later) is a peer dependency: your components and the runtime must share one React.

MirageX is published as three packages, used together: [`@mirage-x/core`](https://www.npmjs.com/package/@mirage-x/core) (shared Unit definitions), [`@mirage-x/server`](https://www.npmjs.com/package/@mirage-x/server) (run time) and [`@mirage-x/mirror`](https://www.npmjs.com/package/@mirage-x/mirror) (build time). **See the [MirageX README](https://github.com/rheniumNV/mirage-x#readme) for how to use them**, and [`examples/basic`](https://github.com/rheniumNV/mirage-x/tree/master/examples/basic) for a complete app.

```bash
npm install @mirage-x/core @mirage-x/server @mirage-x/mirror react@19
```

Node.js 22 or later, ESM only. Keep the three packages at the same version.

## License

MIT

## Development with generative AI

This project is developed with generative AI coding tools. Changes are reviewed and tested by the maintainer, including in Resonite.
