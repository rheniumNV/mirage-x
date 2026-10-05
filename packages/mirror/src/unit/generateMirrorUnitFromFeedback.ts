import { Document, type Slot } from "@frdt/frdt";
import type { DetailBase, UnitConfig } from "@mirage-x/core";

import { assetPath } from "../assets.js";
import { readFeedback } from "../feedback/feedbackFile.js";
import {
  addDynamicField,
  addDynamicVariableSpace,
  addSlotReferenceVariable,
  childNamed,
  importSlots,
  requireChild,
  requireReference,
  stringOf,
} from "../frdt/util.js";

const NOT_COPIED = new Set(["DV/Props", "DV/Refs", "DV/Static"]);

/**
 * Build a unit's mirror object from its feedback (the unit as saved in
 * Resonite). Layout of the result:
 *
 * ```text
 * <code>                 DynamicVariableSpace
 *   DV                   Static.Ref -> Ref
 *   Ref                  DynamicVariableSpace
 *     Main ...           (copied from the feedback, with its other children)
 *     DV/Static          Static.Root / Static.Main / Static.ChildrenParent
 *     DV/Props           Props.<name> (DynamicField, or DynamicReferenceVariable<Slot>)
 *     DV/Refs            Refs.<name>  (only with refsConfig)
 * ```
 */
export const generateMirrorUnitFromFeedback = <C extends DetailBase>({
  config,
  rawFeedback,
}: {
  /**
   * The unit's feedback (`readFeedbackIfExists(...)`). When it is missing,
   * the empty unit template is used.
   */
  rawFeedback?: Document;
  config: UnitConfig<C>;
}): Document => {
  const feedback =
    rawFeedback ?? readFeedback(assetPath("unit/emptyFeedback.brson"));

  const feedbackRef = feedback.slotById(
    requireReference(requireChild(feedback.root(), "DV"), "Static.Ref"),
  );
  const feedbackStatic = requireChild(feedbackRef, "DV/Static");
  const mainId = requireReference(feedbackStatic, "Static.Main");
  const childrenParentId = requireReference(
    feedbackStatic,
    "Static.ChildrenParent",
  );

  const unit = Document.empty(
    config.code,
    feedback.versionNumber(),
    feedback.featureFlags(),
  );
  const root = unit.root();
  addDynamicVariableSpace(unit, root);
  const dv = unit.addSlot(root, "DV");
  const ref = unit.addSlot(root, "Ref");
  addSlotReferenceVariable(unit, dv, "Static.Ref", ref.id());
  addDynamicVariableSpace(unit, ref);

  // Main first, then the feedback's other children except the DV slots that
  // are rebuilt below.
  const imported = importSlots(unit, ref, [
    feedback.slotById(mainId),
    ...feedbackRef
      .children()
      .filter((slot) => slot.id() !== mainId && !NOT_COPIED.has(slot.name())),
  ]);
  const copied = (sourceId: string, what: string): string => {
    const id = imported.newId(sourceId);
    if (!id) {
      throw new Error(
        `${config.code}: ${what} points outside the copied slots (${sourceId})`,
      );
    }
    return id;
  };

  const dvStatic = unit.addSlot(ref, "DV/Static");
  addSlotReferenceVariable(unit, dvStatic, "Static.Root", ref.id());
  addSlotReferenceVariable(
    unit,
    dvStatic,
    "Static.Main",
    copied(mainId, "Static.Main"),
  );
  addSlotReferenceVariable(
    unit,
    dvStatic,
    "Static.ChildrenParent",
    copied(childrenParentId, "Static.ChildrenParent"),
  );

  // Targets the feedback's DV/Props and DV/Refs pointed at, by variable name.
  const targets = (slot: Slot | undefined) => {
    const map = new Map<string, string>();
    slot?.components().forEach((component, i) => {
      const name = stringOf(slot.tryComponentValue(i, "VariableName"));
      if (!name) return;
      const target = component.typeName.startsWith(
        "[FrooxEngine]FrooxEngine.DynamicField<",
      )
        ? (stringOf(slot.tryComponentValue(i, "TargetField")) ??
          stringOf(slot.tryComponentValue(i, "TargetReference")))
        : component.typeName.startsWith(
              "[FrooxEngine]FrooxEngine.DynamicReferenceVariable<",
            )
          ? stringOf(slot.tryComponentValue(i, "Reference"))
          : null;
      if (target) map.set(name, target);
    });
    return map;
  };
  const propTargets = targets(childNamed(feedbackRef, "DV/Props"));
  const refTargets = targets(childNamed(feedbackRef, "DV/Refs"));

  /** A DynamicField target must be inside the unit. */
  const fieldTarget = (name: string) => {
    const source = propTargets.get(name);
    return source ? copied(source, name) : null;
  };
  /**
   * Slot references are set at run time by MirageX. When the saved value
   * points outside the unit (e.g. the producer it was bound to while the
   * feedback was saved), drop it instead of leaving a dangling id.
   */
  const slotTarget = (map: Map<string, string>, name: string) => {
    const source = map.get(name);
    if (!source) return null;
    const id = imported.newId(source);
    if (!id) {
      console.warn(
        `${config.code}: ${name} pointed outside the unit when the feedback was saved; it starts empty`,
      );
    }
    return id;
  };

  const dvProps = unit.addSlot(ref, "DV/Props");
  for (const prop of config.syncPropConfigList) {
    const name = `Props.${prop.name}`;
    if (prop.type === "Reference") {
      addSlotReferenceVariable(
        unit,
        dvProps,
        name,
        slotTarget(propTargets, name),
      );
    } else {
      addDynamicField(unit, dvProps, prop.resDVType, name, fieldTarget(name));
    }
  }

  if (config.refsConfigList.length > 0) {
    const dvRefs = unit.addSlot(ref, "DV/Refs");
    for (const refConfig of config.refsConfigList) {
      const name = `Refs.${refConfig.name}`;
      addSlotReferenceVariable(unit, dvRefs, name, slotTarget(refTargets, name));
    }
  }

  return unit;
};
