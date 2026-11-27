[English](https://github.com/rheniumNV/mirage-x/blob/master/packages/mirror/README.md) | [日本語](https://github.com/rheniumNV/mirage-x/blob/master/packages/mirror/README.ja.md)

# @mirage-x/mirror

[MirageX](https://github.com/rheniumNV/mirage-x/blob/master/README.ja.md) のビルド時の部分です。MirageX は、WebSocket を介して Unit のツリーを Resonite 側のミラーと同期させるサーバーサイド React フレームワークです。

このパッケージにあるもの:

- `build()`: Unit の Resonite 側の雛形と、MirageX の core、frame をまとめて、Resonite に置くオブジェクト `output.brson` を作ります
- `generateMirrorUnitFromFeedback`: Unit の雛形を作ります。feedback（`ResFeedback.brson`）があればそれを使います
- feedback: `fetchFeedback` と `attachUnits` で、Resonite で作り込んだ Unit をプロジェクトに取り込みます
- 同梱の core と frame（`generateSimpleFrame`、`generateInstallFrame`）

文書の読み書きには [`@frdt/frdt`](https://www.npmjs.com/package/@frdt/frdt) を使っています。

アプリには、それを動かす [`@mirage-x/core`](https://www.npmjs.com/package/@mirage-x/core) も必要です。**2 つを一緒に使う方法は [MirageX の README](https://github.com/rheniumNV/mirage-x/blob/master/README.ja.md) を見てください**。完成したアプリの例は [`examples/basic`](https://github.com/rheniumNV/mirage-x/tree/master/examples/basic) にあります。

```bash
npm install @mirage-x/core @mirage-x/mirror react@18
```

Node.js 22 以上、ESM のみです。

このプロジェクトは、生成 AI のコーディングツール（Claude Code）を使って開発しています。変更はメンテナーが確認し、テストしています。

## ライセンス

MIT
