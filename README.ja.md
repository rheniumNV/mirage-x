[English](README.md) | [日本語](README.ja.md)

# MirageX

WebSocket を介して、Unit のツリーを Resonite 側のミラーと同期させるサーバーサイド React フレームワークです。

Resonite の UI（やオブジェクトのツリー）を、Node.js のサーバー上で動く React コンポーネントとして書きます。Resonite に置いたオブジェクトがそのサーバーに接続してツリーを映し出し、React の状態が変わると Resonite 側も更新されます。

状態: `0.x` です。API は変わることがあり、マイナーバージョン（0.1 → 0.2）で互換性が崩れることがあります。[CHANGELOG.md](CHANGELOG.md) を見てください。

## 仕組み

```text
[ビルド時] @mirage-x/mirror
  Unit のテンプレート（ResFeedback.brson）＋ 同梱の core / frame
        │ output.brson（Resonite にドラッグ）
        ▼
[Resonite] ミラーのオブジェクト
        │ WebSocket（sync）
        ▼
[実行時] @mirage-x/server（あなたの React アプリ）

@mirage-x/core: 両方が共有する Unit の定義
```

- **Unit** は、型つきの props を持つ Resonite のオブジェクトの種類（テキスト、画像、パネルなど）です。React ではコンポーネント、Resonite ではテンプレートのスロットになります。
- **`@mirage-x/core`** には、両方が共有するもの（Unit の定義 `generateUnitConfig`、`UnitProp`、`UnitRef` と、同期のプロトコル）があります。
- **`@mirage-x/mirror`**（ビルド時）は、すべての Unit のテンプレートと MirageX の core、frame を 1 つの `output.brson` にまとめます。これを Resonite にドラッグします（またはユーザーに出してもらいます）。
- **`@mirage-x/server`**（実行時）は、サーバーで React アプリを描画し、その変更をミラーに送ります。ミラーは Unit のテンプレートを生成し、props を設定します。
- Unit の見た目は **Resonite で** 作ります。Resonite でテンプレートを編集して保存し、`ResFeedback.brson` としてプロジェクトに取り込みます（**feedback** の手順）。

## パッケージ

| パッケージ | 役割 |
| --- | --- |
| [`@mirage-x/core`](packages/core) | 共有: Unit の定義（`generateUnitConfig`、`UnitProp`、`UnitRef`）、`MirrorRef`、同期のプロトコルの型 |
| [`@mirage-x/server`](packages/server) | 実行時: `MirageXServer`、`generateMain`（Unit を React のコンポーネントにする）、フック（`useMirrorRef`、`useBoundCallback`、`useMainRootContext`）、`Logger` |
| [`@mirage-x/mirror`](packages/mirror) | ビルド時: `build()` → `output.brson`、feedback（`fetchFeedback`、`attachUnits`） |

アプリでは 3 つとも使います。各 Unit の `detail.ts` は `@mirage-x/core` を、`main.tsx` とアプリは `@mirage-x/server` を、`mirror.ts` とビルド用スクリプトは `@mirage-x/mirror` を import します。[`examples/basic`](examples/basic) が完成したアプリの例で、以下の手順もこれに沿っています。

## インストール

```bash
pnpm add @mirage-x/core @mirage-x/server @mirage-x/mirror react@19
# または
npm install @mirage-x/core @mirage-x/server @mirage-x/mirror react@19
```

Node.js 22 以上が必要です。ESM のみです（`"type": "module"`）。`react` 19（19.3 以降）は `@mirage-x/server` の peerDependency です。コンポーネントとランタイムが同じ React を使う必要があるためです。3 つのパッケージは一緒にリリースするので、バージョンを揃えてください。

## クイックスタート

### 1. Unit を定義する

Unit ごとに `src/unit/<パッケージ>/<Unit>/` のディレクトリを作ります。Unit の `code` は `"<パッケージ>/<Unit>"` で、ディレクトリと一致させてください（feedback はこれで取り込み先を決めます）。

`detail.ts` — Unit の props:

```ts
import { UnitProp, generateUnitConfig } from "@mirage-x/core";

const detail = {
  code: "PrimitiveUix/PrimitiveText",
  propsConfig: {
    content: UnitProp.String(""),
    size: UnitProp.Float(64),
    color: UnitProp.Color([0, 0, 0, 1]),
  },
};

export const unitConfig = generateUnitConfig(detail);
```

`main.tsx` — React のコンポーネント（実行時）:

```ts
import { generateMain } from "@mirage-x/server";
import { unitConfig } from "./detail.js";

export const O = generateMain(unitConfig);
```

`mirror.ts` — Resonite 側のテンプレート（ビルド時）。feedback があればそれを読みます。feedback のない Unit は空から始まります:

```ts
import { generateMirrorUnitFromFeedback, readFeedbackIfExists } from "@mirage-x/mirror";
import { unitConfig } from "./detail.js";

export const mirror = generateMirrorUnitFromFeedback({
  config: unitConfig,
  rawFeedback: readFeedbackIfExists(new URL("./ResFeedback.brson", import.meta.url)),
});
```

これらをまとめます。`src/unit/main.ts` でコンポーネントを、`src/unit/mirror.ts` でテンプレートを、パッケージ名と Unit 名をキーにして export します:

```ts
// src/unit/main.ts
export { O as PrimitiveText } from "./PrimitiveUix/PrimitiveText/main.js";

// src/unit/mirror.ts
import { mirror as PrimitiveText } from "./PrimitiveUix/PrimitiveText/mirror.js";
export const units = { PrimitiveUix: { PrimitiveText } };
```

### 2. アプリを書く

```tsx
// src/app.tsx
import { PrimitiveText } from "./unit/main.js";

export const App = () => <PrimitiveText content="Hello MirageX" size={64} />;
```

Unit が受け取るのは、`propsConfig` で宣言した props です。`name` や `position` のようなスロットの属性も、そこで宣言します（`position: UnitProp.Float3([0, 0, 0])`）。子要素を受け取るには、detail に `children: "multi"` を書きます。Unit 間の Slot の参照（`@mirage-x/server` の `useMirrorRef`、`UnitProp.Slot`、`UnitRef.Slot`）は [packages/core/docs/reference-prop.md](packages/core/docs/reference-prop.md) で説明しています。

### 3. `output.brson` をビルドする

```ts
// src/build-mirror.ts
import { build, generateSimpleFrame } from "@mirage-x/mirror";
import { units } from "./unit/mirror.js";

await build(
  {
    appCode: "MyApp",
    outputPath: "output",
    cv: {
      mirage: {
        // ミラーの接続先。クラウド変数のパスが空のときは fallback を使います。
        host: { path: "", ownerId: "", fallback: "localhost:3100" },
        useSsl: { path: "", fallback: false },
      },
    },
  },
  units,
  generateSimpleFrame, // または generateInstallFrame
);
```

`output/output.brson` と `output/version.json` が書き出されます。出力が変わっていなければ、何も書き込みません。Unit やその feedback を変えたら、ビルドし直してください。

### 4. サーバーを起動する

```ts
// src/server.ts
import http from "node:http";
import { Logger, MirageXServer } from "@mirage-x/server";
import express from "express";
import { WebSocketServer } from "ws";
import { App } from "./app.js";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
app.use(express.json());

const mirageX = new MirageXServer(App, new Logger({ contextName: "my-app", logLevel: "info" }), {
  mirage: {
    url: "http://localhost:3100/",
    port: "3100",
    serverId: "my-app",
    apiPath: {
      info: "/info",
      output: "/output.brson",
      auth: "/auth/:connectionId",
      interactionEvent: "/events",
      websocket: "/ws",
    },
  },
  main: { appCode: "MyApp", outputPath: "output/output.brson", versionPath: "output/version.json" },
  auth: { url: "https://auth.example.local/" },
  platform: { api: { url: "https://api.resonite.com/" } },
});
mirageX.route(app, wss);

server.listen(3100);
```

サーバーは、ビルドしたオブジェクトを `/output.brson` でも配信します。エラー処理や、開発中の `version.json` の再読み込みは [examples/basic/src/server.ts](examples/basic/src/server.ts) を見てください。

### 5. Resonite で開く

`output/output.brson` をワールドにドラッグします。オブジェクトがサーバーに接続し、アプリが表示されます。

## Resonite で Unit を作り込む（feedback）

新しい Unit のテンプレートは空です。Resonite で見た目を作り、プロジェクトに取り込みます:

1. Resonite で、Unit のテンプレートの `Main` スロットの下を編集します（マテリアル、レイアウト、コンポーネントなど）。値の props ごとに、Unit の `DV/Props` にある `Props.<名前>` の DynamicField を、動かしたいフィールドに向けます。
2. オブジェクトを**公開インベントリのフォルダ**に保存し、そのフォルダの `resrec:///...` リンクをコピーします。
3. プロジェクトで、そのフォルダの最新のアイテムを取得し、各 Unit の部分を `src/unit/<パッケージ>/<Unit>/ResFeedback.brson` に取り込みます:

   ```ts
   // src/dev/resFeedback/feedbackUnit.ts
   import path from "node:path";
   import { fileURLToPath } from "node:url";
   import { attachUnits, fetchFeedback } from "@mirage-x/mirror";

   const feedbackDir = path.dirname(fileURLToPath(import.meta.url)); // 作業用（中のファイルは gitignore）
   const unitsRoot = path.resolve(feedbackDir, "../../unit");

   await fetchFeedback({ link: process.env.FEEDBACK_LINK!, outputPath: feedbackDir });
   attachUnits({ feedbackDir, unitsRoot, matchPattern: process.argv[2] ?? ".+" }); // 例: "PrimitiveUix/.+"
   ```

   作業用のファイル `ResFeedbackOriginal.brson` と `ResFeedbackMetaOriginal.json` は gitignore し、各 Unit の `ResFeedback.brson`（と `ResFeedbackMeta.json`）をコミットします。
4. `output.brson` をビルドし直します。

取り込み時には、開発環境の接続先（`Static.Web.Host`、`http://` / `ws://` の URL）を空にします。中身が変わっていない Unit は書き換えません。

## Resonite のバージョン

`output.brson` は、Resonite が別々の時期に保存した `.brson` を組み合わせたものです。`@mirage-x/mirror` に同梱の core と frame、それに各 Unit の feedback です。

- 出力の `VersionNumber` は core・frame・各 Unit のうち一番古いものに合わせ、`FeatureFlags` はそのすべてが持つものだけにします。これで、Resonite は読み込み時に古いバージョンで保存されたデータを変換します。変換は出力全体にかかるので、Unit の feedback は、できるだけ同梱の core に近いバージョンの Resonite で保存してください。
- `build` は、それらのバージョンが 90 日より離れているとき、フィーチャーフラグを外したときや値が違うとき、core や Unit の `TypeVersions` が出力と違うときに警告します。
- feedback のない Unit は core のバージョンを使い、出力のバージョンを下げません。
- 代わりに frame の `VersionNumber` と `FeatureFlags` をそのまま使うには、`build` の設定で `versionSource: "frame"` を指定します（既定は `"oldest"`）。この場合、core や Unit にある古いバージョンの Resonite で保存されたデータは変換されません。`build` は、frame と違うフラグについて警告します。バージョンが 90 日より離れているときの警告も出ます。

## サンプル

| サンプル | 内容 |
| --- | --- |
| [`examples/basic`](examples/basic) | UIX のパネルと Slot の参照のデモ（mirror のビルド、サーバー、Unit の feedback） |

## 開発

Node.js `>=22.13` と [pnpm](https://pnpm.io) が必要です。pnpm のバージョンはルートの `package.json` の `packageManager` で固定しています。最近の pnpm（10 以上）なら自動でそのバージョンに切り替わります。Corepack は不要です（Node.js 25 以降には同梱されていません）。

```bash
pnpm install
pnpm build
pnpm typecheck   # パッケージをビルドしてから、パッケージと examples を型チェック
pnpm test        # パッケージをビルドしてから、各パッケージのテストを実行
pnpm --filter @mirage-x/example-basic build:mirror
pnpm --filter @mirage-x/example-basic start
```

examples の `package.json` は npm のバージョンの範囲で依存を書いています。このモノレポの中では、pnpm がローカルのパッケージにリンクします。

CI（`.github/workflows/ci.yml`）は、プルリクエストごとに install、build、typecheck、test、examples の `build:mirror` を実行し、examples の出力を `examples/basic/baseline/output.brson` と構造と値で比べます（id とアプリのバージョンは比べません）。出力が変わる変更（新しい feedback や `mirror` の変更）では、同じプルリクエストで基準を更新してください:

```bash
pnpm --filter @mirage-x/example-basic build:mirror
pnpm --filter @mirage-x/example-basic baseline:update
```

```text
packages/
  core/      @mirage-x/core（共有）
  server/    @mirage-x/server（実行時）
  mirror/    @mirage-x/mirror（assets/: 同梱の core と frame）
examples/
  basic/
```

### 同梱の core と frame を更新する

`packages/mirror/assets/` には、MirageX の core と frame を Resonite の `.brson` で置いています。Resonite から更新するには:

1. `packages/mirror/.env.example` を `.env` にコピーし、`FEEDBACK_LINK` にフォルダの `resrec:///...` リンクを設定します。
2. 次を実行します:

   ```bash
   pnpm --filter @mirage-x/mirror feedback
   # = feedback:fetch の後に
   #   feedback:attach:core           → assets/core/ResFeedback.brson
   #   feedback:attach:frame:simple   → assets/frame/simpleFrame/ResFeedback.brson
   #   feedback:attach:frame:install  → assets/frame/installFrame/ResFeedback.brson
   ```

取得したアイテムは、バイト列のまま `packages/mirror/scripts/feedback/ResFeedbackOriginal.brson`（gitignore）に置かれます。ルートの名前が `Holder` なら最初の子を使います。frame は `Static.FrameCode` が一致するとき（`Simple` / `InstalledAvatar`）だけ更新します。core と frame はビルド時に読むので、`mirror` をビルドし直す必要はありません。

## リリース

3 つのパッケージは、同じバージョンで一緒にリリースします。

1. `packages/core/package.json`、`packages/server/package.json`、`packages/mirror/package.json`、`packages/core/src/version.ts` のバージョン（と `examples/basic/package.json` の範囲）を変え、`CHANGELOG.md` に項目を足します。これを `master` にマージします。
2. そのコミットに `v<バージョン>` のタグを付けて push します（`git tag v0.1.0 && git push origin v0.1.0`）。
3. `.github/workflows/release.yml` が、タグと各パッケージのバージョンを照らし合わせ、ビルド、テスト、pack（`workspace:^` が実際の範囲になります）を行い、`@mirage-x/core`、`@mirage-x/server`、`@mirage-x/mirror` の順に npm provenance つきで公開します。認証は npm の trusted publishing（OIDC）で、トークンは保存しません。npmjs.com で、各パッケージの trusted publisher に GitHub Actions の `rheniumNV` / `mirage-x` / `release.yml` を設定しています。すでに npm にあるバージョンは飛ばします。

trusted publisher は、すでに存在するパッケージにしか設定できず、設定してから 2 日以内に公開しないと無効になります。そのため 0.1.0 は手で公開し、trusted publisher は次のリリースの直前に設定します。

## ライセンス

[MIT](LICENSE)

## 生成 AI を使った開発

このプロジェクトは、生成 AI のコーディングツールを使って開発しています。変更はメンテナーが確認し、Resonite での動作も含めてテストしています。
