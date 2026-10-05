import {
  UnitProp,
  generateUnitConfig,
  type getMainProps,
  type getMirrorProps,
  type getWebProps,
} from "@mirage-x/core";

const detail = {
  code: "Demo/SlotTarget",
  propsConfig: {
    name: UnitProp.String("SlotTarget"),
    tag: UnitProp.String(""),
    active: UnitProp.Boolean(true),
    position: UnitProp.Float3([0, 0, 0]),
    rotation: UnitProp.FloatQ([0, 0, 0, 0]),
    scale: UnitProp.Float3([1, 1, 1]),
    /** Producer Slot from useMirrorRef / rootSlotRef */
    target: UnitProp.Slot(),
  },
  children: "multi" as const,
};

export type MainProps = getMainProps<typeof detail>;
export type MirrorProps = getMirrorProps<typeof detail>;
export type WebProps = getWebProps<typeof detail>;
export const unitConfig = generateUnitConfig(detail);
