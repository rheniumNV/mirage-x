# Reference props（Slot / RootSlot）

React 側では `useMirrorRef` で Unit 間の Slot 参照を共有します。Resonite 側は既存の sync イベントで適用します（**新しい event type は追加しません**）。

## React での使い方

```tsx
import {
  useMirrorRef,
  UnitProp,
  UnitRef,
  generateUnitConfig,
  generateMain,
} from "@mirage-x/core";

// 生産者: ルート Slot は常に rootSlotRef で export 可能（refsConfig 不要）
// refsConfig の名前付き ref は mirror brson の DV/Refs.{name} になる
const producerDetail = {
  code: "Demo/SlotHost",
  propsConfig: {},
  refsConfig: {
    anchor: UnitRef.Slot(), // → anchorRef={...}, DV/Refs.anchor
  },
};

// 消費者
const consumerDetail = {
  code: "Demo/NeedsSlot",
  propsConfig: {
    parent: UnitProp.Slot(), // MirrorRef を受け取る
  },
};

const rootSlotRef = useMirrorRef();
const anchorRef = useMirrorRef();

return (
  <>
    <SlotHost rootSlotRef={rootSlotRef} anchorRef={anchorRef} />
    <NeedsSlot parent={rootSlotRef} />
  </>
);
```

| Bind prop | 生産者側の実体 | Sync の `option` |
| --- | --- | --- |
| `rootSlotRef`（全 Unit） | Unit のルート Slot（`Static.Ref`） | `{ refType: "RootSlot" }` |
| `refsConfig` 由来の `${name}Ref` | `DV/Refs.{name}` | `{ refType: "Slot", refKey: "<name>" }` |

## Sync フレーム

```text
{ type: "sync", data: <UnitChangeClientEvent> }
```

### `updateProp`（本命）

**ルート Slot**

```ts
{
  type: "updateProp",
  unit: {
    id: "<consumerUnitId>",
    prop: {
      key: "parent",
      type: "Reference",
      value: "<sourceUnitId>" | "",
      option: { refType: "RootSlot" }
    }
  }
}
```

Resonite 側: `value` で生産者 Unit を特定し、そのルート Slot（`Static.Ref`）を消費者の `Props.{key}` に書く。`value === ""` のときはクリア。

**名前付き Slot（`refsConfig`）**

```ts
{
  type: "updateProp",
  unit: {
    id: "<consumerUnitId>",
    prop: {
      key: "parent",
      type: "Reference",
      value: "<sourceUnitId>" | "",
      option: { refType: "Slot", refKey: "anchor" }
    }
  }
}
```

Resonite 側: `value` で生産者 Unit を特定し、その `DV/Refs` 配下の `Refs.{refKey}` を読み、消費者の `Props.{key}` に書く。

DV 名:

- 消費者フィールド: `"Props." + key`（`DV/Props` 配下）
- 生産者の名前付き export: `"Refs." + refKey`（`DV/Refs` 配下）

### `initUnitPropOrigin`

他の prop と同じ形。Reference の初期値は `value: ""` で、MirrorRef が bind されるまでは通常 `option: { refType: "RootSlot" }`。

### Mirror brson 上の配置

- `DV/Props` — `propsConfig`（値フィールド + 消費者側 Reference の DRV）
- `DV/Refs` — `refsConfig` があるときのみ。エントリごとに `DynamicReferenceVariable<Slot>`（`Refs.{name}`）
- ルート Slot の export 用に `DV/Refs` は作らない。既存の `Static.Ref` を使う

## 送らないもの

| 項目 | 理由 |
| --- | --- |
| `useMirrorRef` / `*Ref={handle}` の bind | React 専用 |
| 専用の `registerRef` イベント | 生産者 id + `option` で足りる |
| User / Asset の `refType` | 後続 |
