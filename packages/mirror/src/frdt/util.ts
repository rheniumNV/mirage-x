import type {
  Document,
  Field,
  ImportOptions,
  Slot,
  Value,
} from "@frdt/frdt";

/**
 * Small helpers over `@frdt/frdt` for the MirageX assembly: values, lookups by
 * name / dynamic variable, and the components MirageX creates (the same
 * fields as the component templates MirageX used before frdt).
 */

export const SLOT_REFERENCE_VARIABLE =
  "[FrooxEngine]FrooxEngine.DynamicReferenceVariable<[FrooxEngine]FrooxEngine.Slot>";
const DYNAMIC_VARIABLE_SPACE = "[FrooxEngine]FrooxEngine.DynamicVariableSpace";

export type StringValue = Extract<Value, { kind: "string" }>;
export type BoolValue = Extract<Value, { kind: "bool" }>;

export const str = (value: string): StringValue => ({ kind: "string", value });
export const bool = (value: boolean): BoolValue => ({ kind: "bool", value });
export const int = (value: number): Value => ({ kind: "int", value });

export const stringOf = (value: Value | null | undefined): string | null =>
  value && value.kind === "string" ? value.value : null;

export const childNamed = (slot: Slot, name: string): Slot | undefined =>
  slot.children().find((child) => child.name() === name);

export const requireChild = (slot: Slot, name: string): Slot => {
  const child = childNamed(slot, name);
  if (!child) {
    throw new Error(`Slot "${name}" not found under "${slot.name()}"`);
  }
  return child;
};

/** Index of the component whose `VariableName` is `name`, or -1. */
export const variableIndex = (slot: Slot, name: string): number =>
  slot
    .components()
    .findIndex(
      (_, i) => stringOf(slot.tryComponentValue(i, "VariableName")) === name,
    );

/** The id a `DynamicReferenceVariable` named `name` points at. */
export const referenceOf = (slot: Slot, name: string): string | null => {
  const i = variableIndex(slot, name);
  return i < 0 ? null : stringOf(slot.tryComponentValue(i, "Reference"));
};

export const requireReference = (slot: Slot, name: string): string => {
  const id = referenceOf(slot, name);
  if (!id) {
    throw new Error(`"${name}" not found on "${slot.name()}"`);
  }
  return id;
};

/** Every slot under `slot`, depth first, `slot` included. */
export const allSlots = (slot: Slot): Slot[] => [
  slot,
  ...slot.children().flatMap(allSlots),
];

/**
 * The parent of `slot`, found from the tree (`Children`), or `undefined` for
 * the root. `slot.parentReference()` is not used: in a file saved by
 * Resonite, `ParentReference` is not the parent slot's id.
 */
export const parentOf = (doc: Document, slot: Slot): Slot | undefined => {
  const id = slot.id();
  return allSlots(doc.root()).find((candidate) =>
    candidate.children().some((child) => child.id() === id),
  );
};

/**
 * Set `Value` of every dynamic value variable named `name` on the slots of
 * `doc` that `where` accepts (all by default). Returns how many were set.
 */
export const setVariableValues = (
  doc: Document,
  name: string,
  value: Value,
  where: (slot: Slot) => boolean = () => true,
): number => {
  let count = 0;
  for (const slot of allSlots(doc.root()).filter(where)) {
    slot.components().forEach((_, i) => {
      if (stringOf(slot.tryComponentValue(i, "VariableName")) === name) {
        slot.setComponentValue(i, "Value", value);
        count += 1;
      }
    });
  }
  return count;
};

/** Point the `DynamicReferenceVariable` named `name` at `targetId`. */
export const setReference = (slot: Slot, name: string, targetId: string) => {
  const i = variableIndex(slot, name);
  if (i < 0) {
    throw new Error(`"${name}" not found on "${slot.name()}"`);
  }
  slot.setComponentValue(i, "Reference", str(targetId));
};

const base = (variableName: string): Field[] => [
  { name: "UpdateOrder", value: int(0) },
  { name: "Enabled", value: bool(true) },
  { name: "VariableName", value: str(variableName) },
];

export const addDynamicVariableSpace = (doc: Document, slot: Slot) =>
  doc.addComponent(slot, DYNAMIC_VARIABLE_SPACE, null, [
    { name: "UpdateOrder", value: int(0) },
    { name: "Enabled", value: bool(true) },
    { name: "SpaceName", value: null },
    { name: "OnlyDirectBinding", value: bool(false) },
  ]);

export const addSlotReferenceVariable = (
  doc: Document,
  slot: Slot,
  variableName: string,
  targetId: string | null,
) =>
  // Resonite saves this type without a TypeVersions entry (version 0).
  doc.addComponent(slot, SLOT_REFERENCE_VARIABLE, null, [
    ...base(variableName),
    { name: "Reference", value: targetId ? str(targetId) : null },
    { name: "OverrideOnLink", value: bool(false) },
  ]);

export const addDynamicField = (
  doc: Document,
  slot: Slot,
  resDVType: string,
  variableName: string,
  targetFieldId: string | null,
) =>
  doc.addComponent(
    slot,
    `[FrooxEngine]FrooxEngine.DynamicField<${resDVType}>`,
    null,
    [
      ...base(variableName),
      { name: "TargetField", value: targetFieldId ? str(targetFieldId) : null },
      { name: "OverrideOnLink", value: bool(false) },
    ],
  );

export const addValueVariable = (
  doc: Document,
  slot: Slot,
  variableName: string,
  value: StringValue | BoolValue,
) =>
  doc.addComponent(
    slot,
    `[FrooxEngine]FrooxEngine.DynamicValueVariable<${value.kind === "bool" ? "bool" : "string"}>`,
    null,
    [
      ...base(variableName),
      { name: "Value", value },
      { name: "OverrideOnLink", value: bool(false) },
    ],
  );

/**
 * `doc.import` that fails when the copy still refers to ids that were not
 * copied, except for `allowed` ones (references the caller rewrites).
 * `label` names what is being imported in the error.
 */
export const importSlots = (
  doc: Document,
  parent: Slot,
  slots: Slot[],
  {
    allowed = [],
    label,
    ...options
  }: ImportOptions & { allowed?: string[]; label?: string } = {},
) => {
  const imported = doc.import(parent, slots, { ...options, unresolved: "keep" });
  const unresolved = imported
    .unresolved()
    .filter((id) => !allowed.includes(id));
  if (unresolved.length > 0) {
    throw new Error(
      `${label ?? `Import under "${parent.name()}"`} refers to ids that were not copied: ${unresolved.join(", ")}`,
    );
  }
  return imported;
};
