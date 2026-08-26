import path from "node:path";
import { fileURLToPath } from "node:url";

import { attachUnits } from "@mirage-x/mirror";

const feedbackDir = path.dirname(fileURLToPath(import.meta.url));
const unitsRoot = path.resolve(feedbackDir, "../../unit");
const matchPattern = process.argv[2];

if (typeof matchPattern !== "string") {
  throw new Error(
    'Set unit pattern, e.g. pnpm feedback:attachUnit -- "PrimitiveUix/PrimitiveImage"',
  );
}

attachUnits({
  feedbackDir,
  unitsRoot,
  matchPattern,
});
