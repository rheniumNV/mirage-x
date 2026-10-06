import fs from "node:fs";

import { Document, compare } from "@frdt/frdt";

/** Feedback parts (core / frames / units) are stored as Resonite `.brson`. */
export type FeedbackFile = string | URL;

export const readFeedback = (file: FeedbackFile): Document =>
  Document.open(fs.readFileSync(file));

/** Like `readFeedback`, but `undefined` when the file does not exist. */
export const readFeedbackIfExists = (
  file: FeedbackFile,
): Document | undefined =>
  fs.existsSync(file) ? readFeedback(file) : undefined;

/**
 * Write a feedback part unless the file already holds the same content
 * (compared by structure with frdt `compare`, so ids do not matter).
 * Returns whether the file was written.
 */
export const writeFeedbackIfChanged = (
  file: FeedbackFile,
  feedback: Document,
): boolean => {
  if (
    fs.existsSync(file) &&
    compare(readFeedback(file), feedback).length === 0
  ) {
    return false;
  }
  fs.writeFileSync(file, feedback.writeBrson());
  return true;
};

export const writeFeedback = (file: FeedbackFile, feedback: Document) => {
  fs.writeFileSync(file, feedback.writeBrson());
};
