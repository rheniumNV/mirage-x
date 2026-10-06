# @mirage-x/mirror

Builds the Resonite mirror (`output.brson`, plus `output.json` / `output.yaml` for now) from MirageX units and the core / frame parts in `assets/` (Resonite `.brson`). Documents are assembled with [`@frdt/frdt`](https://www.npmjs.com/package/@frdt/frdt).

## Install

Workspace dependency:

```ts
import {
  build,
  generateMirrorUnitFromFeedback,
  generateSimpleFrame,
  generateInstallFrame,
  fetchFeedback,
  attachUnits,
  attachCore,
  attachSimpleFrame,
  attachInstallFrame,
  readFeedback,
  readFeedbackIfExists,
  writeFeedback,
} from "@mirage-x/mirror";
```

## Usage

1. Build each unit with `generateMirrorUnitFromFeedback({ config, rawFeedback: readFeedbackIfExists(url) })` (an `@frdt/frdt` `Document`).
2. Call `build(config, units, generateSimpleFrame | generateInstallFrame)`.
3. Artifacts are written under `config.outputPath` when the tree changed vs the previous `output.yaml`.

`build` is the renamed UniPocket MirageX `res()` pipeline entrypoint.

## Feedback（core / frame）

Resonite で編集したオブジェクトを公開フォルダに保存し、その `resrec:///...` を取り込みます。

1. `.env.example` を `.env` にコピーし `FEEDBACK_LINK` を設定
2. パッケージ直下で:

```bash
pnpm --filter @mirage-x/mirror feedback
# 内訳:
#   feedback:fetch
#   feedback:attach:core              → assets/core/ResFeedback.brson
#   feedback:attach:frame:simple      → assets/frame/simpleFrame/ResFeedback.brson
#   feedback:attach:frame:install     → assets/frame/installFrame/ResFeedback.brson
```

- staging: `scripts/feedback/ResFeedbackOriginal.json`（gitignore）
- frame は `Static.FrameCode` が一致するときだけ更新（`Simple` / `InstalledAvatar`）
- 差分なしなら yaml 比較でスキップ
- 部品は実行時に `assets/` から読むので、取り込んだあと mirror を再ビルドする必要はありません（空の Unit の雛形は `assets/unit/emptyFeedback.brson`）

Unit 用 feedback はアプリ側（例: `examples/basic` の `feedback:unit`）を使います。
