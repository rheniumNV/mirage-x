import {
  generateMirrorUnitFromFeedback,
  readFeedbackIfExists,
} from "@mirage-x/mirror";

import { unitConfig } from "./detail.js";

export const mirror = generateMirrorUnitFromFeedback({
  config: unitConfig,
  rawFeedback: readFeedbackIfExists(
    new URL("./ResFeedback.brson", import.meta.url),
  ),
});
