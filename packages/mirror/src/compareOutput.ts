import { Document, compare, type Difference } from "@frdt/frdt";

import { setAppVersion } from "./frame/env.js";

/** A copy of `doc` with the app version in MirageX's ENV slots cleared. */
const withoutAppVersion = (doc: Document): Document => {
  const copy = Document.open(doc.writeBrson());
  setAppVersion(copy, "");
  return copy;
};

/**
 * Compare two `build` outputs by structure and values (frdt `compare`: ids
 * are not compared), ignoring the app version `build` writes into MirageX's
 * ENV slots (the version of another app's ENV embedded in it is compared).
 * An empty result means the outputs are the same apart from that.
 */
export const compareOutput = (
  expected: Document,
  actual: Document,
): Difference[] =>
  compare(withoutAppVersion(expected), withoutAppVersion(actual));
