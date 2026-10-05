import fs from "node:fs";

import type { ObjectContext } from "@mirage-x/virtual-object";
import { Compress, DeCompress } from "brson.js";

/**
 * Feedback parts (core / frames / units) are stored as Resonite `.brson`.
 *
 * The assembly still runs on VirtualObject, which needs the JSON form, so
 * these helpers decode to / encode from that. They are the single place to
 * switch to `@frdt/frdt` documents (#8).
 */
export type FeedbackFile = string | URL;

export const readFeedback = (file: FeedbackFile): ObjectContext =>
  JSON.parse(DeCompress(fs.readFileSync(file))) as ObjectContext;

/** Like `readFeedback`, but `undefined` when the file does not exist. */
export const readFeedbackIfExists = (
  file: FeedbackFile,
): ObjectContext | undefined =>
  fs.existsSync(file) ? readFeedback(file) : undefined;

export const writeFeedback = (file: FeedbackFile, context: ObjectContext) => {
  fs.writeFileSync(file, Compress(JSON.stringify(context)));
};
