[English](https://github.com/rheniumNV/mirage-x/blob/master/packages/core/README.md) | [日本語](https://github.com/rheniumNV/mirage-x/blob/master/packages/core/README.ja.md)

# @mirage-x/core

[MirageX](https://github.com/rheniumNV/mirage-x/blob/master/README.ja.md) の共有部分です。MirageX は、WebSocket を介して Unit のツリーを Resonite 側のミラーと同期させるサーバーサイド React フレームワークです。

実行時とビルド時の両方が使うものをまとめています:

- Unit の定義: `generateUnitConfig`、`UnitProp`、`UnitRef` とその型（`DetailBase`、`UnitConfig`、`getMainProps` など）
- `MirrorRef`（`createMirrorRef`、`isMirrorRef`）と `FunctionEnv`
- サーバーとミラーの間の同期のプロトコルの型

実行時の依存はありません。Slot の参照は [docs/reference-prop.md](https://github.com/rheniumNV/mirage-x/blob/master/packages/core/docs/reference-prop.md) で説明しています。

MirageX は 3 つのパッケージで公開していて、一緒に使います。[`@mirage-x/core`](https://www.npmjs.com/package/@mirage-x/core)（共有する Unit の定義）、[`@mirage-x/server`](https://www.npmjs.com/package/@mirage-x/server)（実行時）、[`@mirage-x/mirror`](https://www.npmjs.com/package/@mirage-x/mirror)（ビルド時）です。**使い方は [MirageX の README](https://github.com/rheniumNV/mirage-x/blob/master/README.ja.md) を見てください**。完成したアプリの例は [`examples/basic`](https://github.com/rheniumNV/mirage-x/tree/master/examples/basic) にあります。

```bash
npm install @mirage-x/core @mirage-x/server @mirage-x/mirror react@19
```

Node.js 22 以上、ESM のみです。3 つのパッケージはバージョンを揃えてください。

## ライセンス

MIT

## 生成 AI を使った開発

このプロジェクトは、生成 AI のコーディングツールを使って開発しています。変更はメンテナーが確認し、Resonite での動作も含めてテストしています。
