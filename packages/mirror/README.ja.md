[English](https://github.com/rheniumNV/mirage-x/blob/master/packages/mirror/README.md) | [日本語](https://github.com/rheniumNV/mirage-x/blob/master/packages/mirror/README.ja.md)

# @mirage-x/mirror

[MirageX](https://github.com/rheniumNV/mirage-x/blob/master/README.ja.md) のビルド時の部分です。MirageX は、WebSocket を介して Unit のツリーを Resonite 側のミラーと同期させるサーバーサイド React フレームワークです。

- `build()`: Unit の Resonite 側のテンプレートと、MirageX の core、frame をまとめて、Resonite に置くオブジェクト `output.brson` を作ります
- `generateMirrorUnitFromFeedback`: Unit のテンプレートを作ります。feedback（`ResFeedback.brson`）があればそれを使います
- feedback: `fetchFeedback` と `attachUnits` で、Resonite で作り込んだ Unit をプロジェクトに取り込みます
- 同梱の core と frame（`generateSimpleFrame`、`generateInstallFrame`）と、独自の frame の feedback から作る frame（`generateSimpleFrameFromFeedback`、`generateInstallFrameFromFeedback`、`placeCore`）

文書の読み書きには [`@frdt/frdt`](https://www.npmjs.com/package/@frdt/frdt) を使っています。`@mirage-x/server` には依存しないので、ビルドする環境にサーバーの依存は要りません。

MirageX は 3 つのパッケージで公開していて、一緒に使います。[`@mirage-x/core`](https://www.npmjs.com/package/@mirage-x/core)（共有する Unit の定義）、[`@mirage-x/server`](https://www.npmjs.com/package/@mirage-x/server)（実行時）、[`@mirage-x/mirror`](https://www.npmjs.com/package/@mirage-x/mirror)（ビルド時）です。**使い方は [MirageX の README](https://github.com/rheniumNV/mirage-x/blob/master/README.ja.md) を見てください**。完成したアプリの例は [`examples/basic`](https://github.com/rheniumNV/mirage-x/tree/master/examples/basic) にあります。

```bash
npm install @mirage-x/core @mirage-x/server @mirage-x/mirror react@19
```

Node.js 22 以上、ESM のみです。3 つのパッケージはバージョンを揃えてください。

## ライセンス

MIT

## 生成 AI を使った開発

このプロジェクトは、生成 AI のコーディングツールを使って開発しています。変更はメンテナーが確認し、Resonite での動作も含めてテストしています。
