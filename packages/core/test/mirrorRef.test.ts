import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createMirrorRef, isMirrorRef } from "../src/common/useMirrorRef.js";

describe("MirrorRef", () => {
  it("starts unbound as RootSlot", () => {
    const ref = createMirrorRef();
    assert.equal(ref.getUnitId(), "");
    assert.deepEqual(ref.getOption(), { refType: "RootSlot" });
    assert.equal(ref.getSnapshot(), "|RootSlot");
    assert.ok(isMirrorRef(ref));
    assert.ok(!isMirrorRef({}));
    assert.ok(!isMirrorRef(null));
  });

  it("bind updates unit id, option and snapshot", () => {
    const ref = createMirrorRef();
    ref.bind("unit-1", { refType: "Slot", refKey: "anchor" });
    assert.equal(ref.getUnitId(), "unit-1");
    assert.deepEqual(ref.getOption(), { refType: "Slot", refKey: "anchor" });
    assert.equal(ref.getSnapshot(), "unit-1|Slot|anchor");
  });

  it("notifies subscribers only when the binding changes", () => {
    const ref = createMirrorRef();
    let count = 0;
    const unsubscribe = ref.subscribe(() => {
      count += 1;
    });
    ref.bind("unit-1", { refType: "RootSlot" });
    ref.bind("unit-1", { refType: "RootSlot" }); // same binding
    assert.equal(count, 1);
    ref.bind("unit-1", { refType: "Slot", refKey: "anchor" }); // option changed
    assert.equal(count, 2);
    unsubscribe();
    ref.bind("unit-2", { refType: "RootSlot" });
    assert.equal(count, 2);
  });

  it("clearIf clears only when bound to the given unit, keeping the option", () => {
    const ref = createMirrorRef();
    ref.bind("unit-1", { refType: "Slot", refKey: "anchor" });
    ref.clearIf("unit-2");
    assert.equal(ref.getUnitId(), "unit-1");
    ref.clearIf("unit-1");
    assert.equal(ref.getUnitId(), "");
    assert.deepEqual(ref.getOption(), { refType: "Slot", refKey: "anchor" });
  });

  it("clear does not notify when already unbound", () => {
    const ref = createMirrorRef();
    let count = 0;
    ref.subscribe(() => {
      count += 1;
    });
    ref.clear();
    assert.equal(count, 0);
    ref.bind("unit-1", { refType: "RootSlot" });
    ref.clear();
    assert.equal(count, 2);
    assert.equal(ref.getUnitId(), "");
  });
});
