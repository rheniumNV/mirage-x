import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  UnitProp,
  UnitRef,
  generateMain,
  generateUnitConfig,
  useMirrorRef,
} from "../src/index.js";
import {
  createControl,
  generated,
  mount,
  propUpdates,
} from "./harness.js";

const Host = generateMain(
  generateUnitConfig({
    code: "Test/Host",
    propsConfig: { size: UnitProp.Float(1) },
    refsConfig: { anchor: UnitRef.Slot() },
    children: "multi" as const,
  }),
);

const Target = generateMain(
  generateUnitConfig({
    code: "Test/Target",
    propsConfig: {
      target: UnitProp.Slot(),
      label: UnitProp.String("default"),
      onClick: UnitProp.Function(() => {}),
    },
  }),
);

describe("generateMain: initial render", () => {
  it("emits generateUnit with default props and no updateProp for defaults", async () => {
    const { events } = await mount(<Target />);
    const target = generated(events, "Test/Target");
    assert.equal(target.parentId, "root");
    assert.deepEqual(
      target.defaultProps.map((p) => [p.key, p.type]),
      [
        ["target", "Reference"],
        ["label", "String"],
        ["onClick", "Function"],
      ],
    );
    const reference = target.defaultProps.find((p) => p.key === "target");
    assert.deepEqual(reference, {
      key: "target",
      type: "Reference",
      value: "",
      option: { refType: "RootSlot" },
    });
    assert.deepEqual(propUpdates(events, target.id), []);
  });

  it("emits one updateProp for a non-default initial value", async () => {
    const { events } = await mount(<Target label="hello" />);
    const target = generated(events, "Test/Target");
    assert.deepEqual(propUpdates(events, target.id), [
      { key: "label", type: "String", value: "hello", option: {} },
    ]);
  });

  it("nests children under the parent unit id", async () => {
    const { events } = await mount(
      <Host>
        <Target />
      </Host>,
    );
    const host = generated(events, "Test/Host");
    const target = generated(events, "Test/Target");
    assert.equal(target.parentId, host.id);
  });
});

describe("generateMain: prop updates", () => {
  it("sends updateProp only when the value changes", async () => {
    const control = createControl("a");
    const { events, since } = await mount(
      <control.Control>{(label) => <Target label={label} />}</control.Control>,
    );
    const target = generated(events, "Test/Target");

    let after = since();
    await control.set("b");
    assert.deepEqual(propUpdates(after(), target.id), [
      { key: "label", type: "String", value: "b", option: {} },
    ]);

    after = since();
    await control.set("b"); // same value: React bails out, nothing is sent
    assert.deepEqual(propUpdates(after(), target.id), []);
  });

  it("registers Function props in functionMap and replaces the old id", async () => {
    const first = () => {};
    const second = () => {};
    const control = createControl<() => void>(first);
    const { events, functionMap, since } = await mount(
      <control.Control>{(fn) => <Target onClick={fn} />}</control.Control>,
    );
    const target = generated(events, "Test/Target");
    const [initial] = propUpdates(events, target.id);
    assert.equal(initial?.type, "Function");
    const firstId = initial?.value as string;
    assert.equal(functionMap.get(firstId), first);

    const after = since();
    await control.set(second);
    const [changed] = propUpdates(after(), target.id);
    const secondId = changed?.value as string;
    assert.notEqual(secondId, firstId);
    assert.equal(functionMap.get(secondId), second);
    assert.equal(functionMap.has(firstId), false);
  });
});

describe("generateMain: Slot references", () => {
  const RefApp = ({ showHost = true }: { showHost?: boolean }) => {
    const rootSlotRef = useMirrorRef();
    const anchorRef = useMirrorRef();
    return (
      <>
        {showHost && <Host rootSlotRef={rootSlotRef} anchorRef={anchorRef} />}
        <Target label="root" target={rootSlotRef} />
        <Target label="anchor" target={anchorRef} />
      </>
    );
  };

  const targets = (events: Parameters<typeof generated>[0]) =>
    events.flatMap((e) =>
      e.type === "generateUnit" && e.unit.code === "Test/Target"
        ? [e.unit.id]
        : [],
    );

  it("sends the producer id and ref option once bound", async () => {
    const { events } = await mount(<RefApp />);
    const host = generated(events, "Test/Host");
    const [rootTarget, anchorTarget] = targets(events);
    assert.ok(rootTarget && anchorTarget);

    const rootRefs = propUpdates(events, rootTarget).filter(
      (p) => p.key === "target",
    );
    const anchorRefs = propUpdates(events, anchorTarget).filter(
      (p) => p.key === "target",
    );
    assert.deepEqual(rootRefs, [
      {
        key: "target",
        type: "Reference",
        value: host.id,
        option: { refType: "RootSlot" },
      },
    ]);
    assert.deepEqual(anchorRefs, [
      {
        key: "target",
        type: "Reference",
        value: host.id,
        option: { refType: "Slot", refKey: "anchor" },
      },
    ]);
  });

  it("clears the reference when the producer unmounts", async () => {
    const control = createControl(true);
    const { events, since } = await mount(
      <control.Control>{(show) => <RefApp showHost={show} />}</control.Control>,
    );
    const host = generated(events, "Test/Host");
    const [rootTarget, anchorTarget] = targets(events);
    assert.ok(rootTarget && anchorTarget);

    const after = since();
    await control.set(false);
    const later = after();
    assert.ok(
      later.some((e) => e.type === "destroyUnit" && e.unit.id === host.id),
    );
    assert.deepEqual(
      propUpdates(later, rootTarget).filter((p) => p.key === "target"),
      [
        {
          key: "target",
          type: "Reference",
          value: "",
          option: { refType: "RootSlot" },
        },
      ],
    );
    // The option is kept; the client clears on value === "".
    assert.deepEqual(
      propUpdates(later, anchorTarget).filter((p) => p.key === "target"),
      [
        {
          key: "target",
          type: "Reference",
          value: "",
          option: { refType: "Slot", refKey: "anchor" },
        },
      ],
    );
  });
});
