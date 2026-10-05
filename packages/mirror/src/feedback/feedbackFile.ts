import fs from "node:fs";

import { Document } from "@frdt/frdt";
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

/**
 * Write a feedback part. The feedback import (`attach*`) still produces the
 * JSON form via VirtualObject (#14), so that is accepted too.
 */
export const writeFeedback = (
  file: FeedbackFile,
  feedback: Document | ObjectContext,
) => {
  fs.writeFileSync(
    file,
    feedback instanceof Document
      ? feedback.writeBrson()
      : Compress(JSON.stringify(feedback)),
  );
};
