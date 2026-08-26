import {
  UnitProp,
  generateUnitConfig,
  type getMainProps,
  type getMirrorProps,
  type getWebProps,
} from "@mirage-x/core";

const detail = {
  code: "PrimitiveUix/PrimitiveImage",
  propsConfig: {
    color: UnitProp.Color([1, 1, 1, 1]),
    preserveAspect: UnitProp.Boolean(true),
  },
  children: "multi" as const,
};

export type MainProps = getMainProps<typeof detail>;
export type MirrorProps = getMirrorProps<typeof detail>;
export type WebProps = getWebProps<typeof detail>;
export const unitConfig = generateUnitConfig(detail);
