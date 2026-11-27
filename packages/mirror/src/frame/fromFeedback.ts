import { Document } from "@frdt/frdt";

import { readFeedback, type FeedbackFile } from "../feedback/feedbackFile.js";

/**
 * A fresh document of a frame feedback for each build. A `Document` is
 * copied, so the caller's document is not changed.
 */
export const openFrame = (feedback: FeedbackFile | Document): Document =>
  isDocument(feedback)
    ? Document.open(feedback.writeBrson())
    : readFeedback(feedback);

/** Duck-typed, so a Document from another copy of frdt works too. */
const isDocument = (value: FeedbackFile | Document): value is Document =>
  typeof value === "object" &&
  typeof (value as Partial<Document>).writeBrson === "function";
