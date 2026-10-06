import fs from "node:fs";

import { Document, compare } from "@frdt/frdt";
import type { ObjectContext } from "@mirage-x/virtual-object";
import { Compress } from "brson.js";

/** Feedback parts (core / frames / units) are stored as Resonite `.brson`. */
export type FeedbackFile = string | URL;

export const readFeedback = (file: FeedbackFile): Document =>
  Document.open(fs.readFileSync(file));

/** Like `readFeedback`, but `undefined` when the file does not exist. */
export const readFeedbackIfExists = (
  file: FeedbackFile,
): Document | undefined =>
  fs.existsSync(file) ? readFeedback(file) : undefined;

const isDocument = (value: Document | ObjectContext): value is Document =>
  typeof (value as Partial<Document>).writeBrson === "function";

const toDocument = (feedback: Document | ObjectContext): Document =>
  isDocument(feedback)
    ? feedback
    : Document.open(Compress(JSON.stringify(feedback)));

/**
 * Write a feedback part unless the file already holds the same content
 * (compared by structure with frdt `compare`, so ids do not matter).
 * Returns whether the file was written.
 */
export const writeFeedbackIfChanged = (
  file: FeedbackFile,
  feedback: Document | ObjectContext,
): boolean => {
  const next = toDocument(feedback);
  if (fs.existsSync(file) && compare(readFeedback(file), next).length === 0) {
    return false;
  }
  fs.writeFileSync(file, next.writeBrson());
  return true;
};

/**
 * Write a feedback part. The feedback import (`attach*`) still produces the
 * JSON form via VirtualObject (#14), so that is accepted too.
 */
export const writeFeedback = (
  file: FeedbackFile,
  feedback: Document | ObjectContext,
) => {
  // Duck-typed so that a Document from another copy of @frdt/frdt is not
  // mistaken for JSON.
  fs.writeFileSync(
    file,
    isDocument(feedback)
      ? feedback.writeBrson()
      : Compress(JSON.stringify(feedback)),
  );
};
