import type { RefType } from "../../common/mainProp.js";

export type RefConfig = {
  /** Named export under DV/Refs (not the unit root). */
  type: Extract<RefType, "Slot">;
};

/**
 * Producer export for a named Slot under `DV/Refs.{name}`.
 * Enables `${name}Ref` bind prop. Root Slot is always available as `rootSlotRef`.
 */
export const Slot = (): RefConfig => ({
  type: "Slot",
});
