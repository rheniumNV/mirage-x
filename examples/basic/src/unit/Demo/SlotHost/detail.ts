import {
  UnitProp,
  UnitRef,
  generateUnitConfig,
  type getMainProps,
  type getMirrorProps,
  type getWebProps,
} from "@mirage-x/core";

const detail = {
  code: "Demo/SlotHost",
  propsConfig: {
    name: UnitProp.String("SlotHost"),
    tag: UnitProp.String(""),
    active: UnitProp.Boolean(true),
    position: UnitProp.Float3([0, 0, 0]),
    rotation: UnitProp.FloatQ([0, 0, 0, 0]),
    scale: UnitProp.Float3([1, 1, 1]),
  },
  // Named exports → DV/Refs.* in mirror (wire: refType "Slot" + refKey).
  // Root Slot is always available as rootSlotRef (wire: refType "RootSlot").
  refsConfig: {
    anchor: UnitRef.Slot(),
  },
  children: "multi" as const,
};

export type MainProps = getMainProps<typeof detail>;
export type MirrorProps = getMirrorProps<typeof detail>;
export type WebProps = getWebProps<typeof detail>;
export const unitConfig = generateUnitConfig(detail);
