# @mirage-x/mirror

Builds Resonite mirror assets (`output.brson` / `output.json` / `output.yaml`) from MirageX unit virtual objects and embedded ResFeedback templates.

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
} from "@mirage-x/mirror";
```

## Usage

1. Build unit trees with `generateMirrorUnitFromFeedback` (or your own `VirtualContext` units).
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
#   feedback:attach:core              → src/core/ResFeedback.json
#   feedback:attach:frame:simple      → src/frame/simpleFrame/ResFeedback.json
#   feedback:attach:frame:install     → src/frame/installFrame/ResFeedback.json
```

- staging: `scripts/feedback/ResFeedbackOriginal.json`（gitignore）
- frame は `Static.FrameCode` が一致するときだけ更新（`Simple` / `InstalledAvatar`）
- 差分なしなら yaml 比較でスキップ

Unit 用 feedback はアプリ側（例: `examples/basic` の `feedback:unit`）を使います。
