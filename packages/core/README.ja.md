[English](https://github.com/rheniumNV/mirage-x/blob/master/packages/core/README.md) | [日本語](https://github.com/rheniumNV/mirage-x/blob/master/packages/core/README.ja.md)

# @mirage-x/core

[MirageX](https://github.com/rheniumNV/mirage-x/blob/master/README.ja.md) の実行時の部分です。MirageX は、WebSocket を介して Unit のツリーを Resonite 側のミラーと同期させるサーバーサイド React フレームワークです。

このパッケージにあるもの:

- Unit の定義: `generateUnitConfig`、`UnitProp`、`UnitRef`、`generateMain`（Unit を React のコンポーネントにする）
- `MirageXServer`（`@mirage-x/core/server`）: React アプリを描画し、その変更を Resonite のミラーに送ります
- フックとヘルパー: `useMirrorRef`、`useBoundCallback`、`useMainRootContext`、`FunctionEnv`、`Logger`

アプリには、Resonite に置くオブジェクトをビルドする [`@mirage-x/mirror`](https://www.npmjs.com/package/@mirage-x/mirror) も必要です。**2 つを一緒に使う方法は [MirageX の README](https://github.com/rheniumNV/mirage-x/blob/master/README.ja.md) を見てください**。完成したアプリの例は [`examples/basic`](https://github.com/rheniumNV/mirage-x/tree/master/examples/basic) にあります。

```bash
npm install @mirage-x/core @mirage-x/mirror react@18
```

Node.js 22 以上、ESM のみです。`react` 18 は peerDependency です。

このプロジェクトは、生成 AI のコーディングツール（Claude Code）を使って開発しています。変更はメンテナーが確認し、テストしています。

## ライセンス

MIT
