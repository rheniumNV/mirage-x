[English](https://github.com/rheniumNV/mirage-x/blob/master/packages/server/README.md) | [日本語](https://github.com/rheniumNV/mirage-x/blob/master/packages/server/README.ja.md)

# @mirage-x/server

[MirageX](https://github.com/rheniumNV/mirage-x/blob/master/README.ja.md) の実行時の部分です。MirageX は、WebSocket を介して Unit のツリーを Resonite 側のミラーと同期させるサーバーサイド React フレームワークです。

- `MirageXServer`: サーバーで React アプリを描画し、その変更を Resonite のミラーに送ります（express + WebSocket）
- `generateMain`: Unit を React のコンポーネントにします
- フック: `useMirrorRef`、`useBoundCallback`、`useMainRootContext`
- `Logger` と、コンポーネントからサーバーの logger を使う `useLogger` / `LogContext`（`LogContext` は、子に独自のコンテキスト名を持つ子 logger を渡します）

`react` 19（19.3 以降）は peerDependency です。コンポーネントとランタイムが同じ React を使う必要があるためです。

MirageX は 3 つのパッケージで公開していて、一緒に使います。[`@mirage-x/core`](https://www.npmjs.com/package/@mirage-x/core)（共有する Unit の定義）、[`@mirage-x/server`](https://www.npmjs.com/package/@mirage-x/server)（実行時）、[`@mirage-x/mirror`](https://www.npmjs.com/package/@mirage-x/mirror)（ビルド時）です。**使い方は [MirageX の README](https://github.com/rheniumNV/mirage-x/blob/master/README.ja.md) を見てください**。完成したアプリの例は [`examples/basic`](https://github.com/rheniumNV/mirage-x/tree/master/examples/basic) にあります。

```bash
npm install @mirage-x/core @mirage-x/server @mirage-x/mirror react@19
```

Node.js 22 以上、ESM のみです。3 つのパッケージはバージョンを揃えてください。

## ライセンス

MIT

## 生成 AI を使った開発

このプロジェクトは、生成 AI のコーディングツールを使って開発しています。変更はメンテナーが確認し、Resonite での動作も含めてテストしています。
