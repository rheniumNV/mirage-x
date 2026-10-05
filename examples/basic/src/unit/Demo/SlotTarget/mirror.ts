import { generateMirrorUnitFromFeedback } from "@mirage-x/mirror";

import ResFeedback from "./ResFeedback.json" with { type: "json" };
import { unitConfig } from "./detail.js";

export const mirror = generateMirrorUnitFromFeedback({
  config: unitConfig,
  rawFeedback: ResFeedback,
});
