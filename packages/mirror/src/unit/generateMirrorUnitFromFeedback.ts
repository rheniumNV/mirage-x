import { Document, type FeatureFlag, type Slot } from "@frdt/frdt";
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
   * the unit starts with an empty `Main`.
   */
  rawFeedback?: Document;
  config: UnitConfig<C>;
}): Document => {
  // A unit without feedback holds nothing saved by Resonite, so it takes the
  // core's version and flags and does not pull the output's version down.
  const { versionNumber, featureFlags } = rawFeedback
    ? {
        versionNumber: rawFeedback.versionNumber(),
        featureFlags: rawFeedback.featureFlags(),
      }
    : coreVersion();

  const unit = Document.empty(config.code, versionNumber, featureFlags);
  const root = unit.root();
  addDynamicVariableSpace(unit, root);
  const dv = unit.addSlot(root, "DV");
  const ref = unit.addSlot(root, "Ref");
  addSlotReferenceVariable(unit, dv, "Static.Ref", ref.id());
  addDynamicVariableSpace(unit, ref);

  const source = rawFeedback
    ? copyFromFeedback(unit, ref, rawFeedback, config.code)
    : emptyMain(unit, ref);

  const dvStatic = unit.addSlot(ref, "DV/Static");
  addSlotReferenceVariable(unit, dvStatic, "Static.Root", ref.id());
  addSlotReferenceVariable(unit, dvStatic, "Static.Main", source.mainId);
  addSlotReferenceVariable(
    unit,
    dvStatic,
    "Static.ChildrenParent",
    source.childrenParentId,
  );

  const { propTargets, refTargets, newId, copied } = source;

  /** A DynamicField target must be inside the unit. */
  const fieldTarget = (name: string) => {
    const target = propTargets.get(name);
    return target ? copied(target, name) : null;
  };
  /**
   * Slot references are set at run time by MirageX. When the saved value
   * points outside the unit (e.g. the producer it was bound to while the
   * feedback was saved), drop it instead of leaving a dangling id.
   */
  const slotTarget = (map: Map<string, string>, name: string) => {
    const target = map.get(name);
    if (!target) return null;
    const id = newId(target);
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

type UnitSource = {
  mainId: string;
  childrenParentId: string;
  /** Saved `Props.*` / `Refs.*` targets, as ids in the feedback. */
  propTargets: Map<string, string>;
  refTargets: Map<string, string>;
  /** The id in the unit of a feedback id, or null when it was not copied. */
  newId: (sourceId: string) => string | null;
  /** Like `newId`, but fails naming `what`. */
  copied: (sourceId: string, what: string) => string;
};

let coreVersionCache:
  | { versionNumber: string; featureFlags: FeatureFlag[] }
  | undefined;
const coreVersion = () => {
  if (!coreVersionCache) {
    const core = readFeedback(assetPath("core/ResFeedback.brson"));
    coreVersionCache = {
      versionNumber: core.versionNumber(),
      featureFlags: core.featureFlags(),
    };
  }
  return coreVersionCache;
};

const emptyMain = (unit: Document, ref: Slot): UnitSource => {
  const main = unit.addSlot(ref, "Main");
  return {
    mainId: main.id(),
    childrenParentId: main.id(),
    propTargets: new Map(),
    refTargets: new Map(),
    newId: () => null,
    copied: (sourceId, what) => {
      throw new Error(`${what} points outside the unit (${sourceId})`);
    },
  };
};

/** Copy `Main` and the feedback's other children (except the DV slots). */
const copyFromFeedback = (
  unit: Document,
  ref: Slot,
  feedback: Document,
  code: string,
): UnitSource => {
  const feedbackRef = feedback.slotById(
    requireReference(requireChild(feedback.root(), "DV"), "Static.Ref"),
  );
  const feedbackStatic = requireChild(feedbackRef, "DV/Static");
  const mainId = requireReference(feedbackStatic, "Static.Main");
  const childrenParentId = requireReference(
    feedbackStatic,
    "Static.ChildrenParent",
  );

  // Main first, then the feedback's other children except the DV slots that
  // are rebuilt.
  const imported = importSlots(
    unit,
    ref,
    [
      feedback.slotById(mainId),
      ...feedbackRef
        .children()
        .filter(
          (slot) => slot.id() !== mainId && !NOT_COPIED.has(slot.name()),
        ),
    ],
    { label: `${code}: the feedback` },
  );
  const newId = (sourceId: string) => imported.newId(sourceId);
  const copied = (sourceId: string, what: string): string => {
    const id = newId(sourceId);
    if (!id) {
      throw new Error(
        `${code}: ${what} points outside the copied slots (${sourceId})`,
      );
    }
    return id;
  };

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

  return {
    mainId: copied(mainId, "Static.Main"),
    childrenParentId: copied(childrenParentId, "Static.ChildrenParent"),
    propTargets,
    refTargets,
    newId,
    copied,
  };
};
