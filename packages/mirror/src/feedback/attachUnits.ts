import fs from "node:fs";
import path from "node:path";

import { childNamed, requireChild, requireReference } from "../frdt/util.js";
import {
  extractPart,
  readStagedFeedback,
  readStagedMeta,
  writePart,
} from "./staging.js";

export type AttachUnitsOptions = {
  /** Directory holding the fetched feedback (`ResFeedbackOriginal.brson`). */
  feedbackDir: string;
  /** Root of unit packages (e.g. examples/basic/src/unit) */
  unitsRoot: string;
  /** Full regex for `Package/Unit` (e.g. `PrimitiveUix/PrimitiveImage` or `PrimitiveUix/.+`) */
  matchPattern: string;
};

const directories = (dir: string): string[] =>
  fs
    .readdirSync(dir)
    .filter((name) => fs.statSync(path.resolve(dir, name)).isDirectory());

/**
 * Write each matching unit's part of the feedback
 * (`AppRoot/Main/Package/<package>/<package>/<unit>`) to
 * `<unitsRoot>/<package>/<unit>/ResFeedback.brson`.
 */
export const attachUnits = (options: AttachUnitsOptions): void => {
  const unitFilterRegex = new RegExp(`^${options.matchPattern}$`);
  console.info(`matchPattern=${options.matchPattern}`);

  const doc = readStagedFeedback(options.feedbackDir);
  const meta = readStagedMeta(options.feedbackDir);
  if (meta === undefined) {
    throw new Error(
      `Missing meta in ${options.feedbackDir}. Run feedback:fetch first.`,
    );
  }

  const packageSlot = requireChild(
    requireChild(
      doc.slotById(requireReference(doc.root(), "Static.AppRoot")),
      "Main",
    ),
    "Package",
  );

  const targets = directories(options.unitsRoot).flatMap((packageName) =>
    directories(path.resolve(options.unitsRoot, packageName)).map((unit) => ({
      packageName,
      unit,
      code: `${packageName}/${unit}`,
    })),
  );
  const matched = targets.filter(({ code }) => unitFilterRegex.test(code));
  console.log("unit:", matched.length, "/", targets.length);

  for (const { packageName, unit, code } of matched) {
    const pkg = childNamed(packageSlot, packageName);
    const unitSlot = pkg && childNamed(pkg, code);
    if (!unitSlot) {
      console.info(`not found ${code}`);
      continue;
    }
    writePart({
      outputDir: path.resolve(options.unitsRoot, packageName, unit),
      part: extractPart(doc, unitSlot),
      meta,
      label: code,
    });
  }
};
