import type { Document } from "@frdt/frdt";

import { assetPath } from "../../assets.js";
import { readFeedback } from "../../feedback/feedbackFile.js";
import type { GenerateFrame } from "../../generateClient.js";
import { requireReference, str } from "../../frdt/util.js";
import { placeCore } from "../placeCore.js";

/**
 * A frame named `<appCode>Root` whose panel (`Static.PanelRoot`) is named
 * `appCode`; the core goes under the panel.
 */
export const generateInstallFrame: GenerateFrame = ({ appCode, core, env }) => {
  const frame: Document = readFeedback(
    assetPath("frame/installFrame/ResFeedback.brson"),
  );
  const frameRoot = frame.root();
  frameRoot.set("Name", str(`${appCode}Root`));
  const panel = frame.slotById(requireReference(frameRoot, "Static.PanelRoot"));
  panel.set("Name", str(appCode));
  return placeCore(frame, { core, env }, () => panel);
};
