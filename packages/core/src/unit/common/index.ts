import type { ReactNode } from "react";
import type * as MainProp from "../../common/mainProp.js";
import type { MirrorRef } from "../../common/mirrorRef.js";
import type { RefConfig } from "./unitRef.js";

export * as UnitProp from "./unitProp.js";
export * as UnitRef from "./unitRef.js";
export type { RefConfig } from "./unitRef.js";

export type DetailBase = {
  code: string;
  propsConfig: {
    [key: string]: MainProp.Base;
  };
  refsConfig?: {
    [key: string]: RefConfig;
  };
  children?: "multi";
};

type RefPropName<K extends string> = `${K}Ref`;

type getNamedRefProps<C extends DetailBase> = C["refsConfig"] extends {
  [key: string]: RefConfig;
}
  ? {
      [K in keyof C["refsConfig"] & string as RefPropName<K>]?: MirrorRef | null;
    }
  : object;

/** Every Unit can export its root Slot via `rootSlotRef`. */
type getRootSlotRefProp = {
  rootSlotRef?: MirrorRef | null;
};

export type getDefaultProps<C extends DetailBase> = {
  [K in keyof C["propsConfig"]]: C["propsConfig"][K]["main"];
};

export type getMainProps<C extends DetailBase> = Partial<
  getDefaultProps<C> &
    getRootSlotRefProp &
    getNamedRefProps<C> &
    (C["children"] extends "multi" ? { children?: ReactNode } : object)
>;

export type getMirrorProps<C extends DetailBase> = {
  [K in keyof C["propsConfig"]]: C["propsConfig"][K]["mirror"];
};

export type getWebProps<C extends DetailBase> = {
  [K in keyof C["propsConfig"]]: C["propsConfig"][K]["mirror"];
} & (C["children"] extends "multi" ? { children?: ReactNode } : object);

type SyncPropConfig = {
  name: string;
  type: MainProp.Base["type"];
  resDVType: string;
  dvMode: MainProp.DvMode;
  enumType?: string;
  enumKeys?: string[];
  refType?: MainProp.RefType;
};

type RefExportConfig = {
  name: string;
  refType: Extract<MainProp.RefType, "Slot">;
};

export type UnitConfig<C extends DetailBase> = {
  code: string;
  defaultProps: getDefaultProps<C>;
  syncPropConfigList: SyncPropConfig[];
  refsConfigList: RefExportConfig[];
};

export const generateUnitConfig = <C extends DetailBase>(
  config: C,
): UnitConfig<C> => ({
  code: config.code,
  defaultProps: Object.entries(config.propsConfig).reduce(
    (acc, [key, propConfig]: [keyof C["propsConfig"], MainProp.Base]) => {
      acc[key] = propConfig.main;
      return acc;
    },
    {} as getDefaultProps<C>,
  ),
  syncPropConfigList: Object.entries(config.propsConfig).map(
    ([key, propConfig]) => ({
      name: key,
      type: propConfig.type,
      resDVType: propConfig.resDVType,
      dvMode: propConfig.dvMode,
      enumType: propConfig.enumType,
      enumKeys: propConfig.enumKeys,
      refType:
        propConfig.type === "Reference" ? propConfig.refType : undefined,
    }),
  ),
  refsConfigList: Object.entries(config.refsConfig ?? {}).map(
    ([key, refConfig]) => ({
      name: key,
      refType: refConfig.type,
    }),
  ),
});
