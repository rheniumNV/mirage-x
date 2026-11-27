import { Document, compare, type Difference } from "@frdt/frdt";

import { VERSION_VARIABLE } from "./build.js";
import { setVariableValues, str } from "./frdt/util.js";

/** A copy of `doc` with the app version in MirageX's ENV slots cleared. */
const withoutAppVersion = (doc: Document): Document => {
  const copy = Document.open(doc.writeBrson());
  setVariableValues(
    copy,
    VERSION_VARIABLE,
    str(""),
    (slot) => slot.name() === "ENV",
  );
  return copy;
};

/**
 * Compare two `build` outputs by structure and values (frdt `compare`: ids
 * are not compared), ignoring the app version `build` writes into ENV.
 * An empty result means the outputs are the same apart from that.
 */
export const compareOutput = (
  expected: Document,
  actual: Document,
): Difference[] =>
  compare(withoutAppVersion(expected), withoutAppVersion(actual));
