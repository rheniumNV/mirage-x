import { Document } from "@frdt/frdt";

import { readFeedback, type FeedbackFile } from "../feedback/feedbackFile.js";

/**
 * A fresh document of a frame feedback for each build. A `Document` is
 * copied, so the caller's document is not changed.
 */
export const openFrame = (feedback: FeedbackFile | Document): Document =>
  typeof feedback === "string" || feedback instanceof URL
    ? readFeedback(feedback)
    : Document.open(feedback.writeBrson());
