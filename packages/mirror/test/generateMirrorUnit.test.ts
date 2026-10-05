import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UnitProp, UnitRef, generateUnitConfig } from "@mirage-x/core";
import type { VirtualContext, VirtualSlot } from "@mirage-x/virtual-object";

import { generateMirrorUnitFromFeedback } from "../src/unit/generateMirrorUnitFromFeedback.js";

const config = generateUnitConfig({
  code: "Test/Host",
  propsConfig: {
    size: UnitProp.Float(1),
    target: UnitProp.Slot(),
  },
  refsConfig: { anchor: UnitRef.Slot() },
});

const allSlots = (slot: VirtualSlot): VirtualSlot[] => [
  slot,
  ...slot.children.flatMap(allSlots),
];

const slotsNamed = (context: VirtualContext, name: string) =>
  allSlots(context.object).filter((slot) => slot.name.asPrimitive() === name);

const variables = (context: VirtualContext, variableName: string) =>
  allSlots(context.object).flatMap((slot) =>
    slot.components.filter(
      (component) =>
        component.data.VariableName?.asPrimitive() === variableName,
    ),
  );

const REF_VAR =
  "[FrooxEngine]FrooxEngine.DynamicReferenceVariable<[FrooxEngine]FrooxEngine.Slot>";

describe("generateMirrorUnitFromFeedback", () => {
  it("creates one DV/Refs with Refs.{name} and a Reference DRV for Slot props", () => {
    const unit = generateMirrorUnitFromFeedback({ config, rawFeedback: {} });

    assert.equal(slotsNamed(unit, "DV/Refs").length, 1);
    const anchor = variables(unit, "Refs.anchor");
    assert.equal(anchor.length, 1);
    assert.equal(anchor[0]?.type, REF_VAR);

    const target = variables(unit, "Props.target");
    assert.equal(target.length, 1);
    assert.equal(target[0]?.type, REF_VAR);

    assert.equal(variables(unit, "Props.size").length, 1);
  });

  // Regression: the feedback's own DV/Refs used to be carried over next to the
  // freshly created one, adding one more on every feedback round-trip.
  it("does not duplicate DV/Refs across feedback round-trips", () => {
    let feedback: unknown = {};
    for (let round = 1; round <= 3; round++) {
      const unit = generateMirrorUnitFromFeedback({
        config,
        rawFeedback: feedback,
      });
      assert.equal(slotsNamed(unit, "DV/Refs").length, 1, `round ${round}`);
      assert.equal(variables(unit, "Refs.anchor").length, 1, `round ${round}`);
      assert.equal(slotsNamed(unit, "DV/Props").length, 1, `round ${round}`);
      assert.equal(slotsNamed(unit, "DV/Static").length, 1, `round ${round}`);

      // What `feedback:unit` stores is the exported unit.
      feedback = unit.export().context;
      assert.equal(
        typeof (feedback as { VersionNumber?: unknown }).VersionNumber,
        "string",
      );
    }
  });
});
