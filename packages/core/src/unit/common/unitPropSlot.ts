import type * as MainProp from "../../common/mainProp.js";
import type { MirrorRef } from "../../common/mirrorRef.js";

type Option = { dvMode: MainProp.DvMode };

/**
 * Consumer prop: accepts a MirrorRef and syncs as `type: "Reference"`.
 * Wire `option` comes from the MirrorRef bind (`RootSlot` or `Slot` + `refKey`).
 */
export const Slot = (
  defaultValue: MirrorRef | null = null,
  { dvMode }: Option = { dvMode: "Field" },
): MainProp.Reference => ({
  type: "Reference",
  main: defaultValue,
  mirror: "",
  resDVType: "[FrooxEngine]FrooxEngine.Slot",
  dvMode,
  /** Field is a Slot SyncRef; source kind is carried on the MirrorRef. */
  refType: "Slot",
});
