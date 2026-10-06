# @mirage-x/mirror

Builds the Resonite mirror (`output.brson` and `version.json`) from MirageX units and the core / frame parts in `assets/` (Resonite `.brson`). Documents are assembled with [`@frdt/frdt`](https://www.npmjs.com/package/@frdt/frdt).

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
3. `output.brson` and `version.json` are written under `config.outputPath`. Ids are renumbered from a fixed seed, so the same inputs give the same bytes; when the output (apart from the version) is identical to the previous one, nothing is written and `build` returns `{ changed: false }`.

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
- 中身が同じ（frdt `compare` で id を除いて比較）なら書き込まない（`writeFeedbackIfChanged`）
- 部品は実行時に `assets/` から読むので、取り込んだあと mirror を再ビルドする必要はありません（空の Unit の雛形は `assets/unit/emptyFeedback.brson`）

Unit 用 feedback はアプリ側（例: `examples/basic` の `feedback:unit`）を使います。
