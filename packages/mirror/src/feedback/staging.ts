import fs from "node:fs";
import path from "node:path";

import type { Document, Slot } from "@frdt/frdt";

import { readFeedback, writeFeedbackIfChanged } from "./feedbackFile.js";
import { sanitizeFeedback, unwrapHolder } from "./sanitize.js";

/** The fetched feedback, as downloaded from Resonite. */
export const STAGED_FEEDBACK = "ResFeedbackOriginal.brson";
/** `{ id, creationTime }` of the fetched record. */
export const STAGED_META = "ResFeedbackMetaOriginal.json";

/**
 * Open the fetched feedback in `dir`: unwrap a `Holder` and clear the local
 * connection settings (`sanitizeFeedback`).
 */
export const readStagedFeedback = (dir: string): Document => {
  const file = path.resolve(dir, STAGED_FEEDBACK);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${file}. Run feedback:fetch first.`);
  }
  const doc = unwrapHolder(readFeedback(file));
  sanitizeFeedback(doc);
  return doc;
};

/** The fetched record's meta, or `undefined` when it is missing. */
export const readStagedMeta = (dir: string): string | undefined => {
  const file = path.resolve(dir, STAGED_META);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : undefined;
};

/**
 * A new document of `slot` and its subtree. References to slots and
 * components outside it become null.
 */
export const extractPart = (doc: Document, slot: Slot): Document =>
  doc.extract(slot, { unresolved: "null" }).document();

/**
 * Write a feedback part to `<outputDir>/ResFeedback.brson` (with stable ids)
 * and the record meta next to it, unless the part has not changed.
 */
export const writePart = (option: {
  outputDir: string;
  part: Document;
  meta: string | undefined;
  label: string;
}): void => {
  option.part.renumberIds(0);
  fs.mkdirSync(option.outputDir, { recursive: true });
  const written = writeFeedbackIfChanged(
    path.resolve(option.outputDir, "ResFeedback.brson"),
    option.part,
  );
  if (!written) {
    console.info(`no change in ${option.label}`);
    return;
  }
  if (option.meta !== undefined) {
    fs.writeFileSync(
      path.resolve(option.outputDir, "ResFeedbackMeta.json"),
      option.meta,
    );
  }
  console.info(`attached to ${option.label}`);
};
