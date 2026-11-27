import type { Document, Slot } from "@frdt/frdt";

import { assetPath } from "../../assets.js";
import type { FeedbackFile } from "../../feedback/feedbackFile.js";
import type { GenerateFrame } from "../../generateClient.js";
import { parentOf, str } from "../../frdt/util.js";
import { openFrame } from "../fromFeedback.js";
import { placeCore } from "../placeCore.js";

/**
 * A simple frame from your own frame feedback: the root is named `appCode`
 * and the core takes the place of the placeholder (`Static.AppRoot`), under
 * the placeholder's parent.
 *
 * `feedback` is a `.brson` file (path or URL) or a `Document`; it is read
 * (or copied) for each build.
 */
export const generateSimpleFrameFromFeedback =
  (feedback: FeedbackFile | Document): GenerateFrame =>
  ({ appCode, core, env }) => {
    const frame = openFrame(feedback);
    frame.root().set("Name", str(appCode));
    return placeCore(frame, { core, env }, (placeholder: Slot) => {
      const parent = parentOf(frame, placeholder);
      if (!parent) {
        throw new Error("Static.AppRoot has no parent in the simple frame");
      }
      return parent;
    });
  };

/** The bundled simple frame. See `generateSimpleFrameFromFeedback`. */
export const generateSimpleFrame: GenerateFrame = (option) =>
  generateSimpleFrameFromFeedback(
    assetPath("frame/simpleFrame/ResFeedback.brson"),
  )(option);
