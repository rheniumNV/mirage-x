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

### Resonite versions of the parts

The output is assembled from parts saved by Resonite at different times: the core, the frame, and each unit's feedback. Units distributed as a library cannot be re-saved by their users, so the parts' versions will differ.

- The output's `VersionNumber` is the oldest part's, and its `FeatureFlags` are the ones every part has. When it loads the output, Resonite then converts data saved by older versions.
- That conversion runs on the whole output, including parts saved by newer versions. Mixing versions is therefore still a risk. Keep the parts close to each other when you can.
- `build` warns when the parts are more than 90 days apart and when a flag is left out because some parts lack it.
- A unit without feedback holds nothing saved by Resonite. It takes the core's version and does not lower the output's.

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

- staging: `scripts/feedback/ResFeedbackOriginal.brson`（gitignore）。Resonite から取得したバイト列をそのまま保存します
- 取り込み時、ルートが `Holder` なら最初の子を使い、開発環境の接続先（`Static.Web.Host` などの値、`http://` / `ws://` の URL）を空にします
- frame は `Static.FrameCode` が一致するときだけ更新（`Simple` / `InstalledAvatar`）
- 中身が同じ（frdt `compare` で id を除いて比較）なら書き込まない（`writeFeedbackIfChanged`）
- 部品は実行時に `assets/` から読むので、取り込んだあと mirror を再ビルドする必要はありません。feedback がない Unit は空の `Main` から始まります

Unit 用 feedback はアプリ側（例: `examples/basic` の `feedback:unit`）を使います。
