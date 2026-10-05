import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Document, type Slot } from "@frdt/frdt";
import { UnitProp, UnitRef, generateUnitConfig } from "@mirage-x/core";

import {
  SLOT_REFERENCE_VARIABLE,
  referenceOf,
  stringOf,
} from "../src/frdt/util.js";
import { generateMirrorUnitFromFeedback } from "../src/unit/generateMirrorUnitFromFeedback.js";

const config = generateUnitConfig({
  code: "Test/Host",
  propsConfig: {
    size: UnitProp.Float(1),
    target: UnitProp.Slot(),
  },
  refsConfig: { anchor: UnitRef.Slot() },
});

const allSlots = (slot: Slot): Slot[] => [
  slot,
  ...slot.children().flatMap(allSlots),
];

const slotsNamed = (doc: Document, name: string) =>
  allSlots(doc.root()).filter((slot) => slot.name() === name);

/** Components (with their slot) whose VariableName is `name`. */
const variables = (doc: Document, name: string) =>
  allSlots(doc.root()).flatMap((slot) =>
    slot
      .components()
      .flatMap((component, i) =>
        stringOf(slot.tryComponentValue(i, "VariableName")) === name
          ? [{ slot, index: i, typeName: component.typeName }]
          : [],
      ),
  );

/** Save and reopen, as `feedback:unit` would store the unit. */
const roundTrip = (doc: Document) => Document.open(doc.writeBrson());

describe("generateMirrorUnitFromFeedback", () => {
  it("builds the unit layout with DV/Refs and Reference DRVs", () => {
    const unit = generateMirrorUnitFromFeedback({ config });

    assert.equal(unit.root().name(), "Test/Host");
    const ref = unit.slotById(
      referenceOf(slotsNamed(unit, "DV")[0]!, "Static.Ref")!,
    );
    assert.equal(ref.name(), "Ref");
    assert.deepEqual(
      ref.children().map((slot) => slot.name()),
      ["Main", "DV/Static", "DV/Props", "DV/Refs"],
    );

    const anchor = variables(unit, "Refs.anchor");
    assert.equal(anchor.length, 1);
    assert.equal(anchor[0]?.typeName, SLOT_REFERENCE_VARIABLE);

    const target = variables(unit, "Props.target");
    assert.equal(target.length, 1);
    assert.equal(target[0]?.typeName, SLOT_REFERENCE_VARIABLE);

    const size = variables(unit, "Props.size");
    assert.equal(size[0]?.typeName, "[FrooxEngine]FrooxEngine.DynamicField<float>");

    // Static.Main / Static.ChildrenParent point inside the unit.
    const dvStatic = slotsNamed(unit, "DV/Static")[0]!;
    for (const name of ["Static.Root", "Static.Main", "Static.ChildrenParent"]) {
      const id = referenceOf(dvStatic, name);
      assert.ok(id, name);
      assert.doesNotThrow(() => unit.slotById(id), name);
    }
  });

  // Regression (b89a2bf): the feedback's own DV/Refs used to be carried over
  // next to the new one, adding one more on every feedback round-trip.
  it("does not duplicate DV slots across feedback round-trips", () => {
    let feedback: Document | undefined;
    for (let round = 1; round <= 3; round++) {
      const unit = generateMirrorUnitFromFeedback({ config, rawFeedback: feedback });
      for (const name of ["DV/Refs", "DV/Props", "DV/Static"]) {
        assert.equal(slotsNamed(unit, name).length, 1, `${name}, round ${round}`);
      }
      assert.equal(variables(unit, "Refs.anchor").length, 1, `round ${round}`);
      feedback = roundTrip(unit);
    }
  });

  it("keeps slot references that point inside the unit", () => {
    const first = generateMirrorUnitFromFeedback({ config });
    // Point Refs.anchor at the unit's Main, as if set in Resonite.
    const main = slotsNamed(first, "Main")[0]!;
    const [anchor] = variables(first, "Refs.anchor");
    anchor!.slot.setComponentValue(anchor!.index, "Reference", {
      kind: "string",
      value: main.id(),
    });

    const next = generateMirrorUnitFromFeedback({
      config,
      rawFeedback: roundTrip(first),
    });
    const [nextAnchor] = variables(next, "Refs.anchor");
    const id = stringOf(
      nextAnchor!.slot.tryComponentValue(nextAnchor!.index, "Reference"),
    );
    assert.ok(id);
    assert.equal(next.slotById(id).name(), "Main");
  });

  it("drops slot references that point outside the unit", () => {
    const first = generateMirrorUnitFromFeedback({ config });
    // A run-time binding to another unit, captured when the feedback was saved.
    const [target] = variables(first, "Props.target");
    target!.slot.setComponentValue(target!.index, "Reference", {
      kind: "string",
      value: "00000000-0000-4000-8000-000000000000",
    });

    const next = generateMirrorUnitFromFeedback({
      config,
      rawFeedback: roundTrip(first),
    });
    const [nextTarget] = variables(next, "Props.target");
    assert.equal(
      nextTarget!.slot.tryComponentValue(nextTarget!.index, "Reference"),
      null,
    );
  });

  it("fails when a DynamicField target points outside the unit", () => {
    const first = generateMirrorUnitFromFeedback({ config });
    const [size] = variables(first, "Props.size");
    size!.slot.setComponentValue(size!.index, "TargetField", {
      kind: "string",
      value: "00000000-0000-4000-8000-000000000000",
    });
    assert.throws(
      () =>
        generateMirrorUnitFromFeedback({
          config,
          rawFeedback: roundTrip(first),
        }),
      /Props\.size points outside the copied slots/,
    );
  });
});
