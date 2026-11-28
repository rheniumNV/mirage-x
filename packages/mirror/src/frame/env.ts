import type { Document, Slot } from "@frdt/frdt";

import {
  allSlots,
  childNamed,
  lastChildNamed,
  referenceOf,
  setVariableValues,
  str,
} from "../frdt/util.js";

/** The app version `build` writes into MirageX's ENV slots. */
export const VERSION_VARIABLE = "Env.Version.Current";

/**
 * MirageX's ENV under `slot`: the last `ENV` child of its `DV`. `placeCore`
 * and `generateClient` add it after any slot already there, so an ENV of
 * another app placed in the same `DV` comes first.
 */
export const envUnder = (slot: Slot): Slot | undefined => {
  const dv = childNamed(slot, "DV");
  return dv && lastChildNamed(dv, "ENV");
};

/**
 * The ENV slots MirageX places in an output: the frame's (`DV/ENV` under the
 * root) and the core's (`Main/DV/ENV` under the slot the root's
 * `Static.AppRoot` points at). Found by where they are, not by name, so an ENV
 * of another app embedded in the frame or in a unit is left alone.
 */
export const mirageXEnvSlots = (doc: Document): Slot[] => {
  const root = doc.root();
  const appRootId = referenceOf(root, "Static.AppRoot");
  const appRoot =
    appRootId === null
      ? undefined
      : allSlots(root).find((slot) => slot.id() === appRootId);
  const main = appRoot && childNamed(appRoot, "Main");
  return [envUnder(root), main && envUnder(main)].filter(
    (slot): slot is Slot => slot !== undefined,
  );
};

/**
 * Set the app version in MirageX's ENV slots. Returns how many ENV slots were
 * found and how many values were set.
 */
export const setAppVersion = (
  doc: Document,
  version: string,
): { envSlots: number; updated: number } => {
  const slots = mirageXEnvSlots(doc);
  const ids = new Set(slots.map((slot) => slot.id()));
  const updated = setVariableValues(doc, VERSION_VARIABLE, str(version), (slot) =>
    ids.has(slot.id()),
  );
  return { envSlots: slots.length, updated };
};
