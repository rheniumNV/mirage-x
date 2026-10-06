import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compareOutput, readFeedback } from "@mirage-x/mirror";

import { config } from "../config.js";

/**
 * Compare `output/output.brson` with the committed baseline
 * (`baseline/output.brson`) by structure and values, ignoring ids and the
 * app version. `--update` replaces the baseline with the current output.
 */
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baselinePath = path.resolve(rootDir, "baseline", "output.brson");
const outputPath = config.outputBrsonPath;
const MAX_SHOWN = 50;

if (!fs.existsSync(outputPath)) {
  throw new Error(`Missing ${outputPath}. Run build:mirror first.`);
}

if (process.argv.includes("--update")) {
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.copyFileSync(outputPath, baselinePath);
  console.info(`updated ${path.relative(rootDir, baselinePath)}`);
} else {
  if (!fs.existsSync(baselinePath)) {
    throw new Error(`Missing ${baselinePath}. Run baseline:update first.`);
  }
  const differences = compareOutput(
    readFeedback(baselinePath),
    readFeedback(outputPath),
  );
  if (differences.length === 0) {
    console.info("output matches the baseline");
  } else {
    for (const d of differences.slice(0, MAX_SHOWN)) {
      console.error(`${d.path} ${d.item}: ${d.left ?? "(none)"} -> ${d.right ?? "(none)"}`);
    }
    if (differences.length > MAX_SHOWN) {
      console.error(`... and ${differences.length - MAX_SHOWN} more`);
    }
    console.error(
      `output differs from the baseline in ${differences.length} places. If the change is intended, run baseline:update and commit baseline/output.brson.`,
    );
    process.exitCode = 1;
  }
}
