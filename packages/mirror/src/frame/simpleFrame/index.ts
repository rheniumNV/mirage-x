import type { Document, Slot } from "@frdt/frdt";

import { assetPath } from "../../assets.js";
import { readFeedback } from "../../feedback/feedbackFile.js";
import type { GenerateFrame } from "../../generateClient.js";
import { str } from "../../frdt/util.js";
import { placeCore } from "../placeCore.js";

/** A frame named `appCode`; the core takes the placeholder's place. */
export const generateSimpleFrame: GenerateFrame = ({ appCode, core, env }) => {
  const frame: Document = readFeedback(
    assetPath("frame/simpleFrame/ResFeedback.brson"),
  );
  frame.root().set("Name", str(appCode));
  return placeCore(frame, { core, env }, (placeholder: Slot) => {
    const parentId = placeholder.parentReference();
    if (!parentId) {
      throw new Error("Static.AppRoot has no parent in the simple frame");
    }
    return frame.slotById(parentId);
  });
};
