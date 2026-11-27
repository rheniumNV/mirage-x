import type { Document } from "@frdt/frdt";

import { assetPath } from "../../assets.js";
import type { FeedbackFile } from "../../feedback/feedbackFile.js";
import type { GenerateFrame } from "../../generateClient.js";
import { requireReference, str } from "../../frdt/util.js";
import { openFrame } from "../fromFeedback.js";
import { placeCore } from "../placeCore.js";

/**
 * An install frame from your own frame feedback: the root is named
 * `<appCode>Root`, its panel (`Static.PanelRoot`) is named `appCode`, and the
 * core goes under the panel.
 *
 * The frame needs what `placeCore` needs (`Static.AppRoot` on the root,
 * pointing at the placeholder, and a `DV` child of the root) and a
 * `Static.PanelRoot` reference on the root.
 *
 * `feedback` is a `.brson` file (path or URL) or a `Document`; it is read
 * (or copied) for each build.
 */
export const generateInstallFrameFromFeedback =
  (feedback: FeedbackFile | Document): GenerateFrame =>
  ({ appCode, core, env }) => {
    const frame = openFrame(feedback);
    const frameRoot = frame.root();
    frameRoot.set("Name", str(`${appCode}Root`));
    const panel = frame.slotById(
      requireReference(frameRoot, "Static.PanelRoot"),
    );
    panel.set("Name", str(appCode));
    return placeCore(frame, { core, env }, () => panel);
  };

/** The bundled install frame. See `generateInstallFrameFromFeedback`. */
export const generateInstallFrame: GenerateFrame = (option) =>
  generateInstallFrameFromFeedback(
    assetPath("frame/installFrame/ResFeedback.brson"),
  )(option);
