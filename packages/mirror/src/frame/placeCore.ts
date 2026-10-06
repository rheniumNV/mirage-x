import type { Document, Slot } from "@frdt/frdt";

import {
  importSlots,
  referenceOf,
  requireChild,
  requireReference,
  setReference,
} from "../frdt/util.js";

/**
 * Replace the frame template's placeholder core (`Static.AppRoot`) with the
 * built core, put ENV into the frame's DV, and link the two:
 * frame `Static.AppRoot` -> core root, core `Static.FrameRoot` -> frame root.
 *
 * `parentOf(placeholder)` decides where the core goes (the placeholder's
 * parent for the simple frame, `Static.PanelRoot` for the install frame).
 */
export const placeCore = (
  frame: Document,
  { core, env }: { core: Document; env: Document },
  parentOf: (placeholder: Slot) => Slot,
): Document => {
  const frameRoot = frame.root();
  const placeholder = frame.slotById(
    requireReference(frameRoot, "Static.AppRoot"),
  );
  const parent = parentOf(placeholder);

  // An older core may still point at the frame it was saved in (attach now
  // writes null there); it is rewritten below either way.
  const oldFrameRoot = referenceOf(core.root(), "Static.FrameRoot");
  const [newCore] = importSlots(frame, parent, [core.root()], {
    allowed: oldFrameRoot ? [oldFrameRoot] : [],
    label: "The core",
  }).slots();
  if (!newCore) {
    throw new Error("Failed to import the core into the frame");
  }

  for (const child of placeholder.children()) {
    frame.moveSlot(child, newCore);
  }
  frame.removeSlot(placeholder);

  importSlots(frame, requireChild(frameRoot, "DV"), [env.root()], {
    label: "ENV (frame)",
  });

  setReference(frameRoot, "Static.AppRoot", newCore.id());
  setReference(newCore, "Static.FrameRoot", frameRoot.id());

  frame.rebuildTypes();
  return frame;
};
