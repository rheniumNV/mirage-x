[English](https://github.com/rheniumNV/mirage-x/blob/master/packages/mirror/README.md) | [日本語](https://github.com/rheniumNV/mirage-x/blob/master/packages/mirror/README.ja.md)

# @mirage-x/mirror

The build-time half of [MirageX](https://github.com/rheniumNV/mirage-x#readme), a server-side React framework that syncs a Unit tree to a Resonite-side mirror over WebSocket.

It provides:

- `build()`: assembles your Units' Resonite templates, the MirageX core and a frame into `output.brson`, the object you place in Resonite
- `generateMirrorUnitFromFeedback`: a Unit's template, from its feedback (`ResFeedback.brson`) when there is one
- Feedback: `fetchFeedback` and `attachUnits` pull the Units you shaped in Resonite back into your project
- The bundled core and frames (`generateSimpleFrame`, `generateInstallFrame`)

Documents are read and written with [`@frdt/frdt`](https://www.npmjs.com/package/@frdt/frdt).

An app also needs [`@mirage-x/core`](https://www.npmjs.com/package/@mirage-x/core), which runs it. **See the [MirageX README](https://github.com/rheniumNV/mirage-x#readme) for how to use them together**, and [`examples/basic`](https://github.com/rheniumNV/mirage-x/tree/master/examples/basic) for a complete app.

```bash
npm install @mirage-x/core @mirage-x/mirror react@18
```

Node.js 22 or later, ESM only.

This project is developed with generative AI coding tools (Claude Code); changes are reviewed and tested by the maintainer.

## License

MIT
